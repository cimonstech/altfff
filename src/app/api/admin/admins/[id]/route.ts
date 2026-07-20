import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "super_admin") {
    return { error: NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 }) };
  }

  return { user };
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { id: targetId } = await params;
  if (!targetId) {
    return NextResponse.json({ ok: false, error: "Admin id is required." }, { status: 400 });
  }

  if (targetId === user.id) {
    return NextResponse.json(
      { ok: false, error: "You cannot delete your own admin account through this page." },
      { status: 400 },
    );
  }

  const adminClient = createAdminClient();

  const { data: targetProfile, error: targetError } = await adminClient
    .from("admin_profiles")
    .select("full_name, role")
    .eq("id", targetId)
    .single();

  if (targetError || !targetProfile) {
    return NextResponse.json({ ok: false, error: "Admin not found." }, { status: 404 });
  }

  if (targetProfile.role === "super_admin") {
    const { count, error: countError } = await adminClient
      .from("admin_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin");

    if (countError) {
      console.error("Failed to count super_admin profiles:", countError);
      return NextResponse.json({ ok: false, error: "Failed to verify super admin count." }, { status: 500 });
    }

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Cannot delete the only remaining super admin. Promote another admin to super admin first, then try again.",
        },
        { status: 400 },
      );
    }
  }

  const { data: targetAuth, error: targetAuthError } = await adminClient.auth.admin.getUserById(targetId);
  if (targetAuthError || !targetAuth.user) {
    console.error("Failed to load target auth user before delete:", targetAuthError);
    return NextResponse.json({ ok: false, error: "Admin auth account not found." }, { status: 404 });
  }

  const deletedEmail = targetAuth.user.email ?? null;
  const deletedName = targetProfile.full_name;
  const deletedRole = targetProfile.role;

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);
  if (deleteError) {
    console.error("Admin delete failed:", deleteError);
    return NextResponse.json({ ok: false, error: deleteError.message }, { status: 502 });
  }

  await adminClient.from("activity_logs").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "admin_deleted",
    target_table: "admin_profiles",
    target_id: targetId,
    details: {
      deleted_email: deletedEmail,
      deleted_name: deletedName,
      deleted_role: deletedRole,
    },
  });

  return NextResponse.json({ ok: true });
}
