/** Shared admin-role helpers. Safe for Edge middleware (no Node imports). */

export const FULL_ADMIN_ROLES = ["admin", "super_admin"] as const;
export const CHECKIN_ACCESS_ROLES = ["admin", "super_admin", "checkin_staff"] as const;
export const ADMIN_STAFF_ROLES = CHECKIN_ACCESS_ROLES;

export type FullAdminRole = (typeof FULL_ADMIN_ROLES)[number];
export type CheckInAccessRole = (typeof CHECKIN_ACCESS_ROLES)[number];
export type AdminStaffRole = CheckInAccessRole;

const CHECKIN_STAFF_ALLOWED_ADMIN_PATHS = [
  "/admin/checkin-overview",
  "/admin/checkin",
  "/admin/forbidden",
] as const;

export function isFullAdminRole(role: string | null | undefined): role is FullAdminRole {
  return role === "admin" || role === "super_admin";
}

export function isCheckInAccessRole(role: string | null | undefined): role is CheckInAccessRole {
  return isFullAdminRole(role) || role === "checkin_staff";
}

export function adminHomePath(role: string | null | undefined): string {
  return role === "checkin_staff" ? "/admin/checkin-overview" : "/admin";
}

export function isCheckinStaffAllowedAdminPath(pathname: string): boolean {
  return CHECKIN_STAFF_ALLOWED_ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function formatAdminRoleLabel(role: string | null | undefined): string {
  if (role === "super_admin") return "Super Admin";
  if (role === "checkin_staff") return "Check-in Staff";
  if (role === "admin") return "Admin";
  return "";
}
