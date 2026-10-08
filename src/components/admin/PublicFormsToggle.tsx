"use client";

import { useCallback, useEffect, useState } from "react";
import InlineErrorMessage from "@/components/ui/states/InlineErrorMessage";
import {
  FORM_TOGGLE_FORMS,
  FORM_TOGGLE_LABELS,
  type FormToggleForm,
} from "@/lib/formToggles";

type ToggleState = {
  enabled: boolean;
  updatedAt: string | null;
  updatedByEmail: string | null;
};

type AllToggleState = Record<FormToggleForm, ToggleState>;

function ToggleSwitch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label} ${checked ? "on" : "off"}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-forest" : "bg-ink/25"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-paper shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function PublicFormsToggle() {
  const [state, setState] = useState<AllToggleState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyForm, setBusyForm] = useState<FormToggleForm | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings/public-forms");
      const data = (await res.json()) as {
        ok?: boolean;
        forms?: Record<
          FormToggleForm,
          { enabled?: boolean; updatedAt?: string; updatedByEmail?: string | null }
        >;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.forms) {
        setError(data.error || "Could not load form toggle settings.");
        setState(null);
        return;
      }

      const next = {} as AllToggleState;
      for (const form of FORM_TOGGLE_FORMS) {
        const row = data.forms[form];
        if (!row || typeof row.enabled !== "boolean") {
          setError("Could not load form toggle settings.");
          setState(null);
          return;
        }
        next[form] = {
          enabled: row.enabled,
          updatedAt: row.updatedAt ?? null,
          updatedByEmail: row.updatedByEmail ?? null,
        };
      }
      setState(next);
    } catch {
      setError("Could not load form toggle settings.");
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setFormEnabled = async (form: FormToggleForm, enabled: boolean) => {
    if (!state || busyForm) return;

    setBusyForm(form);
    setError("");
    try {
      const res = await fetch("/api/admin/settings/public-forms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, enabled }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        form?: FormToggleForm;
        enabled?: boolean;
        updatedAt?: string;
        updatedByEmail?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok || data.form !== form || typeof data.enabled !== "boolean") {
        setError(data.error || "Failed to update setting.");
        return;
      }
      setState((prev) =>
        prev
          ? {
              ...prev,
              [form]: {
                enabled: data.enabled!,
                updatedAt: data.updatedAt ?? null,
                updatedByEmail: data.updatedByEmail ?? null,
              },
            }
          : prev,
      );
    } catch {
      setError("Failed to update setting.");
    } finally {
      setBusyForm(null);
    }
  };

  return (
    <section
      aria-label="Public application form toggles"
      className="rounded-xl border border-hairline bg-surface px-4 py-3 md:px-5"
    >
      {loading ? (
        <p className="text-xs text-ink/50">Loading form toggles…</p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
          {FORM_TOGGLE_FORMS.map((form) => (
            <ToggleSwitch
              key={form}
              label={FORM_TOGGLE_LABELS[form]}
              checked={state?.[form]?.enabled ?? false}
              disabled={busyForm !== null}
              onChange={(next) => void setFormEnabled(form, next)}
            />
          ))}
        </div>
      )}

      {error && <InlineErrorMessage className="mt-2" message={error} onRetry={() => void load()} />}
    </section>
  );
}
