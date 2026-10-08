import type { FormToggleState } from "@/lib/appSettings";

type FormToggleResponse = {
  ok?: boolean;
  forms?: FormToggleState;
};

/**
 * Fresh public toggle snapshot. Returns null when the read fails so callers
 * can fail-open for display instead of treating an outage as "forms closed".
 * Submit routes still fail-closed on their own server read.
 */
export async function fetchFormToggleStateClient(): Promise<FormToggleState | null> {
  try {
    const res = await fetch("/api/form-toggles", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as FormToggleResponse;
    if (!res.ok || !data.ok || !data.forms) return null;
    return data.forms;
  } catch {
    return null;
  }
}
