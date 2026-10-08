"use client";

import { useCallback, useEffect, useState } from "react";
import InlineErrorMessage from "@/components/ui/states/InlineErrorMessage";

type ToggleState = {
  enabled: boolean;
  updatedAt: string | null;
  updatedByEmail: string | null;
};

function formatUpdatedAt(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function WalkInRegistrationToggle() {
  const [state, setState] = useState<ToggleState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings/walk-in-registration");
      const data = (await res.json()) as {
        ok?: boolean;
        enabled?: boolean;
        updatedAt?: string;
        updatedByEmail?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok || typeof data.enabled !== "boolean") {
        setError(data.error || "Could not load walk-in registration setting.");
        setState(null);
        return;
      }
      setState({
        enabled: data.enabled,
        updatedAt: data.updatedAt ?? null,
        updatedByEmail: data.updatedByEmail ?? null,
      });
    } catch {
      setError("Could not load walk-in registration setting.");
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flip = async () => {
    if (!state || busy) return;
    const nextEnabled = !state.enabled;
    if (
      !window.confirm(
        nextEnabled
          ? "Open walk-in registration? The public /walk-in form will accept submissions."
          : "Close walk-in registration? The public /walk-in form and API will stop accepting submissions.",
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings/walk-in-registration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        enabled?: boolean;
        updatedAt?: string;
        updatedByEmail?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok || typeof data.enabled !== "boolean") {
        setError(data.error || "Failed to update setting.");
        return;
      }
      setState({
        enabled: data.enabled,
        updatedAt: data.updatedAt ?? null,
        updatedByEmail: data.updatedByEmail ?? null,
      });
    } catch {
      setError("Failed to update setting.");
    } finally {
      setBusy(false);
    }
  };

  const updatedLabel = formatUpdatedAt(state?.updatedAt ?? null);

  return (
    <section
      aria-labelledby="walk-in-toggle-heading"
      className={`rounded-xl border p-4 md:p-5 ${
        state?.enabled
          ? "border-forest/40 bg-forest/10"
          : "border-hairline bg-surface"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            id="walk-in-toggle-heading"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50"
          >
            On-site walk-in registration
          </h2>
          {loading ? (
            <p className="mt-2 text-sm text-ink/60">Loading current state…</p>
          ) : state?.enabled ? (
            <p className="mt-2 text-base font-semibold text-forest">Walk-in registration is open</p>
          ) : (
            <p className="mt-2 text-base font-semibold text-ink/60">Walk-in registration is closed</p>
          )}
          <p className="mt-1 text-sm text-ink/60">
            Controls the public <span className="font-medium">/walk-in</span> form and API. Leave closed until
            doors open on event day.
          </p>
          {updatedLabel && (
            <p className="mt-2 text-xs text-ink/45">
              Last changed {updatedLabel}
              {state?.updatedByEmail ? ` by ${state.updatedByEmail}` : ""}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void flip()}
          disabled={loading || busy || !state}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 ${
            state?.enabled
              ? "border border-hairline bg-paper text-ink hover:bg-paper/80"
              : "bg-forest text-paper hover:opacity-90"
          }`}
        >
          {busy
            ? "Saving…"
            : state?.enabled
              ? "Close walk-in registration"
              : "Open walk-in registration"}
        </button>
      </div>

      {error && (
        <InlineErrorMessage className="mt-3" message={error} onRetry={() => void load()} />
      )}
    </section>
  );
}
