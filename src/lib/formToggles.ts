export const FORM_TOGGLE_FORMS = ["sponsor", "exhibitor", "visit"] as const;

export type FormToggleForm = (typeof FORM_TOGGLE_FORMS)[number];

export const FORM_TOGGLE_SETTING_KEYS: Record<FormToggleForm, string> = {
  sponsor: "sponsor_form_enabled",
  exhibitor: "exhibitor_form_enabled",
  visit: "visit_form_enabled",
};

export const FORM_TOGGLE_LABELS: Record<FormToggleForm, string> = {
  sponsor: "Sponsor Form",
  exhibitor: "Exhibitor Form",
  visit: "Visit Form",
};

export const FORM_TOGGLE_ACTIVITY_ACTIONS: Record<FormToggleForm, string> = {
  sponsor: "sponsor_form_toggled",
  exhibitor: "exhibitor_form_toggled",
  visit: "visit_form_toggled",
};

export function isFormToggleForm(value: unknown): value is FormToggleForm {
  return typeof value === "string" && (FORM_TOGGLE_FORMS as readonly string[]).includes(value);
}

export function formToggleSettingKey(form: FormToggleForm): string {
  return FORM_TOGGLE_SETTING_KEYS[form];
}

export function formToggleActivityAction(form: FormToggleForm): string {
  return FORM_TOGGLE_ACTIVITY_ACTIONS[form];
}

export function formatFormToggleActivitySummary(form: FormToggleForm, enabled: unknown): string {
  const label = FORM_TOGGLE_LABELS[form];
  return enabled === true ? `Opened ${label}` : `Closed ${label}`;
}
