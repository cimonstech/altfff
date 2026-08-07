import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import InviteAdminForm from "@/components/admin/InviteAdminForm";
import AdminList, { type AdminRow } from "@/components/admin/AdminList";

/**
 * super_admin only. This check is independent of the sidebar's hidden nav
 * link (dashboard layout.tsx) - anyone navigating directly to this URL
 * gets redirected here regardless of whether they could see the link.
 */
export default async function AdminAdminsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    redirect("/admin/forbidden");
  }

  const { data: admins } = await supabase
    .from("admin_profiles")
    .select("id, full_name, role, invited_at")
    .order("invited_at", { ascending: false });

  // Email lives on auth.users, not admin_profiles - resolve via the
  // service-role client so the delete modal can show/type-confirm it.
  const adminClient = createAdminClient();
  const adminsWithEmail: AdminRow[] = await Promise.all(
    (admins ?? []).map(async (admin) => {
      const { data } = await adminClient.auth.admin.getUserById(admin.id);
      return {
        ...admin,
        email: data.user?.email ?? null,
      };
    }),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">Admins</h1>
      <p className="mt-3 max-w-[65ch] text-sm text-indigo">
        Invite a new admin. This sends them a Supabase invite email with a link to set their password.
      </p>

      <div className="mt-6 max-w-2xl">
        <InviteAdminForm />
      </div>

      <div className="mt-10">
        <h2 className="font-display text-sm font-bold uppercase tracking-tight text-ink">
          Existing Admins
        </h2>
        <div className="mt-4">
          <AdminList admins={adminsWithEmail} currentUserId={user.id} />
        </div>
      </div>
    </div>
  );
}
