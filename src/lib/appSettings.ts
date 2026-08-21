import { createAnonClient } from "@/lib/supabase/anon";

export const WALK_IN_REGISTRATION_SETTING_KEY = "walk_in_registration_enabled";

export const WALK_IN_REGISTRATION_CLOSED_MESSAGE =
  "Walk-in registration opens at the event. Please check with staff at the door if you need help.";

export const WALK_IN_REGISTRATION_CLOSED_API_ERROR = "Walk-in registration is not open yet.";

/**
 * Reads the walk-in registration gate from app_settings via the session-less
 * anon client (server-only). Fail closed — if the setting cannot be read,
 * registration stays closed.
 */
export async function isWalkInRegistrationEnabled(): Promise<boolean> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", WALK_IN_REGISTRATION_SETTING_KEY)
    .maybeSingle();

  if (error) {
    console.error("[app_settings] failed to read walk_in_registration_enabled:", error.message);
    return false;
  }

  return data?.value === true;
}
