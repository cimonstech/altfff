import type { FormToggleState } from "@/lib/appSettings";

type FormToggleResponse = {
  ok?: boolean;
  forms?: FormToggleState;
};

const FAIL_CLOSED: FormToggleState = {
  sponsor: false,
  exhibitor: false,
  visit: false,
};

export async function fetchFormToggleStateClient(): Promise<FormToggleState> {
  try {
    const res = await fetch("/api/form-toggles", { cache: "no-store" });
    const data = (await res.json()) as FormToggleResponse;
    if (!res.ok || !data.ok || !data.forms) return FAIL_CLOSED;
    return data.forms;
  } catch {
    return FAIL_CLOSED;
  }
}
