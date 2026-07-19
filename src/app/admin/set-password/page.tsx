"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

/**
 * The page Supabase's invite (and password-recovery) email link lands on.
 * The browser client picks up the session from the URL fragment
 * automatically on mount - no manual token parsing needed here - so by the
 * time this form submits, supabase.auth.updateUser() has an active session
 * to act on.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-20">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
          Set Your Password
        </h1>
        <p className="mt-2 text-sm text-indigo">
          Choose a password for your Alt.FFF admin account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
            />
          </div>

          {error && (
            <p className="text-sm text-madder" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Set Password & Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
