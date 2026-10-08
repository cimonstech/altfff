import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCheckInAccessRole, isFullAdminRole, type CheckInAccessRole } from "@/lib/adminRoles";

export type AdminUser = {
  id: string;
  email: string;
};

export type AuthedAdmin = {
  user: AdminUser;
  role: CheckInAccessRole;
};

/** Real admins only (admin | super_admin). Check-in staff is not included. */
export async function requireAdmin(): Promise<AuthedAdmin | { error: NextResponse }> {
  return requireStaffRole(isFullAdminRole);
}

/** Anyone who may operate check-in: admin, super_admin, or checkin_staff. */
export async function requireCheckInAccess(): Promise<AuthedAdmin | { error: NextResponse }> {
  return requireStaffRole(isCheckInAccessRole);
}

async function requireStaffRole(
  allowed: (role: string | null | undefined) => boolean,
): Promise<AuthedAdmin | { error: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !allowed(profile.role)) {
    return { error: NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 }) };
  }

  return {
    user: { id: user.id, email: user.email },
    role: profile.role as CheckInAccessRole,
  };
}
