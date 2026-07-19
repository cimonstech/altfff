import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InviteAdminForm from "@/components/admin/InviteAdminForm";

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
    redirect("/admin");
  }

  const { data: admins } = await supabase
    .from("admin_profiles")
    .select("id, full_name, role, invited_at")
    .order("invited_at", { ascending: false });

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
        <div className="mt-4 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface">
                <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Name
                </th>
                <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Role
                </th>
                <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Invited
                </th>
              </tr>
            </thead>
            <tbody>
              {(admins ?? []).map((a) => (
                <tr key={a.id} className="border-t border-hairline">
                  <td className="p-3 text-ink">{a.full_name || "—"}</td>
                  <td className="p-3 text-ink">{a.role}</td>
                  <td className="p-3 text-ink">
                    {a.invited_at ? new Date(a.invited_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {(!admins || admins.length === 0) && (
                <tr>
                  <td colSpan={3} className="p-3 text-ink/60">
                    No admins found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
