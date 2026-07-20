"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

function urlLooksLikeAuthCallback(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  const search = window.location.search;
  return (
    hash.includes("access_token=") ||
    hash.includes("type=invite") ||
    hash.includes("type=recovery") ||
    hash.includes("error=") ||
    search.includes("code=")
  );
}

/**
 * The page Supabase's invite (and password-recovery) email link lands on.
 * Tokens arrive in the URL hash (implicit flow) or as a ?code= query param
 * (PKCE) - the browser client exchanges either asynchronously on mount.
 * This page waits for that exchange before enabling the password form.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sessionState, setSessionState] = useState<"loading" | "ready" | "invalid">("loading");

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    const markReady = () => {
      if (!settled) {
        settled = true;
        setSessionState("ready");
      }
    };

    const markInvalid = (message?: string) => {
      if (!settled) {
        settled = true;
        setSessionState("invalid");
        if (message) setError(message);
      }
    };

    const bootstrap = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          markInvalid(exchangeError.message);
          return;
        }
        markReady();
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashError = hashParams.get("error_description") ?? hashParams.get("error");
      if (hashError) {
        markInvalid(decodeURIComponent(hashError.replace(/\+/g, " ")));
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) markReady();
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) markReady();
    });

    const timeoutMs = urlLooksLikeAuthCallback() ? 12_000 : 4_000;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        markInvalid(
          urlLooksLikeAuthCallback()
            ? "This invite link is invalid or has expired. Ask a super admin to send a new invite."
            : "No active invite session. Open the link from your invite email, or sign in if you already have a password.",
        );
      }
    }, timeoutMs);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (sessionState !== "ready") {
      setError("Your session is not ready yet. Wait a moment and try again.");
      return;
    }

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

    const {
      data: { session: sessionBefore },
    } = await supabase.auth.getSession();
    if (!sessionBefore) {
      setError("Your session expired. Open the invite link again.");
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    const {
      data: { session: sessionAfter },
    } = await supabase.auth.getSession();
    if (!sessionAfter) {
      setError("Password saved but the session could not be confirmed. Try signing in.");
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

        {sessionState === "loading" && (
          <p className="mt-6 text-sm text-indigo" aria-live="polite">
            Verifying your invite link…
          </p>
        )}

        {sessionState === "invalid" && error && (
          <p className="mt-6 text-sm text-madder" role="alert">
            {error}
          </p>
        )}

        {sessionState === "ready" && (
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
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wide text-ink/60"
              >
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

            {error && sessionState === "ready" && (
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
        )}
      </div>
    </main>
  );
}
