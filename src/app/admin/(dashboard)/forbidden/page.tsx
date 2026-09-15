import PermissionDenied from "@/components/ui/states/PermissionDenied";
import { createClient } from "@/lib/supabase/server";
import { adminHomePath } from "@/lib/adminRoles";

export default async function AdminForbiddenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role ?? null;
  }

  const homeHref = adminHomePath(role);
  const isCheckinStaff = role === "checkin_staff";

  return (
    <PermissionDenied
      homeHref={homeHref}
      homeLabel={isCheckinStaff ? "Back to check-in" : "Back to dashboard"}
      description={
        isCheckinStaff
          ? "Check-in staff can only use the check-in overview and scanner."
          : "This area is restricted. If you believe you should have access, contact a super admin on your team."
      }
    />
  );
}
