import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/siteUrl";
import { reportServerError } from "@/lib/sentryReport";

export const runtime = "nodejs";

type InvitePayload = {
  email?: unknown;
  full_name?: unknown;
  // Optional - the admin_profiles trigger only ever inserts with the
  // column default ('admin'), so a super_admin invite needs a follow-up
  // update via the service-role client below.
  role?: unknown;
};

const VALID_ROLES = ["admin", "super_admin"] as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: InvitePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const role = VALID_ROLES.includes(body.role as (typeof VALID_ROLES)[number])
    ? (body.role as (typeof VALID_ROLES)[number])
    : "admin";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please provide a valid email address." }, { status: 400 });
  }

  // Auth check against the REQUESTER's own session/RLS (never the admin
  // client for this part) - confirms they're signed in AND a super_admin
  // before we ever touch the service-role client below.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "super_admin") {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  // Only past this point do we touch the service-role client - it bypasses
  // RLS entirely, so it must never be reached by an unauthenticated or
  // non-super_admin request.
  const adminClient = createAdminClient();

  const siteUrl = getSiteUrl();
  const redirectTo = `${siteUrl}/admin/set-password`;
  console.info("[admin-invite] getSiteUrl():", siteUrl);
  console.info("[admin-invite] redirectTo:", redirectTo);

  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(redirectTo)) {
    console.error("[admin-invite] redirectTo still points at localhost in production — check SITE_URL.");
    reportServerError(new Error("Admin invite redirectTo uses localhost in production"), {
      route: "/api/admin/invite",
      kind: "admin",
      extra: { siteUrl, redirectTo },
    });
  }

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName || null },
    redirectTo,
  });

  if (inviteError) {
    console.error("Admin invite failed:", inviteError);
    reportServerError(inviteError, {
      route: "/api/admin/invite",
      kind: "admin",
      extra: { op: "invite_user" },
    });
    return NextResponse.json({ ok: false, error: inviteError.message }, { status: 502 });
  }

  // The on_auth_user_created trigger already inserted the admin_profiles
  // row (with the column default role, 'admin') by this point - only need
  // to touch it if the requester chose 'super_admin' specifically.
  if (role === "super_admin" && invited.user?.id) {
    const { error: roleError } = await adminClient
      .from("admin_profiles")
      .update({ role })
      .eq("id", invited.user.id);
    if (roleError) {
      console.error("Failed to set invited admin's role:", roleError);
      reportServerError(roleError, {
        route: "/api/admin/invite",
        kind: "admin",
        extra: { op: "set_role" },
      });
    }
  }

  await adminClient.from("activity_logs").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "admin_invited",
    target_table: "admin_profiles",
    target_id: invited.user?.id ?? null,
    details: { invited_email: email, full_name: fullName || null, role },
  });

  return NextResponse.json({ ok: true });
}
