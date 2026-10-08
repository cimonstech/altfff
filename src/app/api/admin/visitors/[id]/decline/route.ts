import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";
import { reportServerError } from "@/lib/sentryReport";
import { resolveVisitorRouteId, sendVisitorDeclinedEmail, type VisitorRow } from "@/lib/visitorVetting";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const id = await resolveVisitorRouteId(request, context.params);
  if (!id) {
    return NextResponse.json({ ok: false, error: "Visitor not found." }, { status: 404 });
  }

  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("visitor_registrations")
    .select("id, email, full_name, status, qr_token")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("Visitor decline lookup failed:", fetchError);
    reportServerError(fetchError, {
      route: "/api/admin/visitors/[id]/decline",
      kind: "admin",
      extra: { op: "load_visitor", visitor_id: id },
    });
    return NextResponse.json({ ok: false, error: "Failed to load visitor." }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Visitor not found." }, { status: 404 });
  }

  if (existing.status !== "registered") {
    return NextResponse.json(
      { ok: false, error: `Cannot decline - current status is "${existing.status}".` },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("visitor_registrations")
    .update({
      status: "declined",
      status_updated_at: now,
    })
    .eq("id", id)
    .eq("status", "registered")
    .select("*")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("Visitor decline update failed:", updateError);
    reportServerError(updateError ?? new Error("decline update returned no row"), {
      route: "/api/admin/visitors/[id]/decline",
      kind: "admin",
      extra: { op: "decline_visitor", visitor_id: id },
    });
    return NextResponse.json({ ok: false, error: "Failed to decline visitor." }, { status: 500 });
  }

  const emailSent = await sendVisitorDeclinedEmail(updated as VisitorRow);

  return NextResponse.json({
    ok: true,
    row: updated,
    emailSent,
    warning: emailSent ? undefined : "Declined, but the notification email could not be sent - check Resend logs.",
  });
}
