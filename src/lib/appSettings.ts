import { createAnonClient } from "@/lib/supabase/anon";
import {
  FORM_TOGGLE_SETTING_KEYS,
  type FormToggleForm,
  formToggleSettingKey,
} from "@/lib/formToggles";

/** Placeholder copy — not final client-facing wording. */
export const FORM_CLOSED_MESSAGE = "Applications are currently closed. Please check back soon.";

export const FORM_CLOSED_API_ERROR = FORM_CLOSED_MESSAGE;

export const WALK_IN_REGISTRATION_SETTING_KEY = "walk_in_registration_enabled";

export const WALK_IN_REGISTRATION_CLOSED_MESSAGE =
  "Walk-in registration opens at the event. Please check with staff at the door if you need help.";

export const WALK_IN_REGISTRATION_CLOSED_API_ERROR = "Walk-in registration is not open yet.";

export type FormToggleState = Record<FormToggleForm, boolean>;

const FAIL_CLOSED: FormToggleState = {
  sponsor: false,
  exhibitor: false,
  visit: false,
};

async function readFormToggleValues(): Promise<FormToggleState> {
  const supabase = createAnonClient();
  const keys = Object.values(FORM_TOGGLE_SETTING_KEYS);
  const { data, error } = await supabase.from("app_settings").select("key, value").in("key", keys);

  if (error) {
    console.error("[app_settings] failed to read form toggles:", error.message);
    return FAIL_CLOSED;
  }

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value === true]));
  return {
    sponsor: byKey.get(FORM_TOGGLE_SETTING_KEYS.sponsor) ?? false,
    exhibitor: byKey.get(FORM_TOGGLE_SETTING_KEYS.exhibitor) ?? false,
    visit: byKey.get(FORM_TOGGLE_SETTING_KEYS.visit) ?? false,
  };
}

async function isFormEnabled(form: FormToggleForm): Promise<boolean> {
  const supabase = createAnonClient();
  const key = formToggleSettingKey(form);
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();

  if (error) {
    console.error(`[app_settings] failed to read ${key}:`, error.message);
    return false;
  }

  return data?.value === true;
}

export async function readFormToggleState(): Promise<FormToggleState> {
  return readFormToggleValues();
}

export async function isSponsorFormEnabled(): Promise<boolean> {
  return isFormEnabled("sponsor");
}

export async function isExhibitorFormEnabled(): Promise<boolean> {
  return isFormEnabled("exhibitor");
}

export async function isVisitFormEnabled(): Promise<boolean> {
  return isFormEnabled("visit");
}

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
