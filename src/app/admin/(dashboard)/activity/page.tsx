import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ActivityLogView from "@/components/admin/ActivityLogView";

/**
 * super_admin only. Same server-side guard as /admin/admins — nav hiding
 * alone is not sufficient.
 */
export default async function AdminActivityLogPage() {
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

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
        Activity Log
      </h1>
      <p className="mt-3 max-w-[65ch] text-sm text-indigo">
        Immutable audit trail of admin actions. Entries cannot be edited or deleted.
      </p>
      <ActivityLogView />
    </div>
  );
}
