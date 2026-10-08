import { createAdminClient } from "@/lib/supabase/admin";

/** Only this account may read or change the per-form toggles in admin UI/API. */
export const PUBLIC_FORMS_TOGGLE_ADMIN_EMAIL = "cimonstechnologies@gmail.com";

/**
 * Live email lookup via auth.users (through the service-role admin API),
 * keyed off the authenticated user ID — not the JWT email claim.
 */
export async function canUpdatePublicFormsToggle(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return false;

  return data.user.email === PUBLIC_FORMS_TOGGLE_ADMIN_EMAIL;
}

/** Same live lookup, returning the canonical email for audit fields. */
export async function getAuthenticatedUserEmail(userId: string): Promise<string | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}
