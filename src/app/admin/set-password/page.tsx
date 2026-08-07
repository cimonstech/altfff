"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

type PendingAuth =
  | { kind: "pkce"; code: string }
  | { kind: "implicit"; accessToken: string; refreshToken: string };

function parsePendingAuth(): PendingAuth | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (code) return { kind: "pkce", code };

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hashError = hashParams.get("error_description") ?? hashParams.get("error");
  if (hashError) {
    throw new Error(decodeURIComponent(hashError.replace(/\+/g, " ")));
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  if (accessToken && refreshToken) {
    return { kind: "implicit", accessToken, refreshToken };
  }

  return null;
}

/**
 * Invite / recovery landing page. Deliberately does NOT auto-consume auth
 * tokens on page load — corporate email scanners can pre-fetch invite links
 * and burn one-time tokens before the real admin clicks (Aaero Xpress incident
 * class). The admin must click "Confirm invite" first.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sessionState, setSessionState] = useState<
    "loading" | "awaiting_confirm" | "ready" | "invalid"
  >("loading");
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const supabase = createClient();

        let pending: PendingAuth | null = null;
        try {
          pending = parsePendingAuth();
        } catch (parseErr) {
          if (!cancelled) {
            setSessionState("invalid");
            setError(parseErr instanceof Error ? parseErr.message : "Invalid invite link.");
          }
          return;
        }

        if (pending) {
          if (!cancelled) {
            setPendingAuth(pending);
            setSessionState("awaiting_confirm");
          }
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!cancelled) {
          setSessionState(session ? "ready" : "invalid");
          if (!session) {
            setError(
              "No active invite session. Open the link from your invite email, or sign in if you already have a password.",
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSessionState("invalid");
          setError(err instanceof Error ? err.message : "Could not verify your invite link.");
        }
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirmInvite = async () => {
    if (!pendingAuth) return;
    setConfirming(true);
    setError("");

    try {
      const supabase = createClient();

      if (pendingAuth.kind === "pkce") {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(pendingAuth.code);
        if (exchangeError) throw exchangeError;
      } else {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: pendingAuth.accessToken,
          refresh_token: pendingAuth.refreshToken,
        });
        if (setSessionError) throw setSessionError;
      }

      setPendingAuth(null);
      setSessionState("ready");
      // Strip tokens from the URL so refresh doesn't re-prompt.
      window.history.replaceState({}, "", "/admin/set-password");
    } catch (err) {
      setSessionState("invalid");
      setError(
        err instanceof Error
          ? err.message
          : "This invite link is invalid or has expired. Ask a super admin to send a new invite.",
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (sessionState !== "ready") {
      setError("Your session is not ready yet. Confirm your invite link first.");
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

    try {
      const supabase = createClient();
      const {
        data: { session: sessionBefore },
      } = await supabase.auth.getSession();
      if (!sessionBefore) {
        setError("Your session expired. Open the invite link again.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      const {
        data: { session: sessionAfter },
      } = await supabase.auth.getSession();
      if (!sessionAfter) {
        setError("Password saved but the session could not be confirmed. Try signing in.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your password. Try again.");
    } finally {
      setSubmitting(false);
    }
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
            Checking invite link…
          </p>
        )}

        {sessionState === "awaiting_confirm" && (
          <div className="mt-8">
            <p className="text-sm text-indigo">
              Click below to confirm this invite is for you. This step prevents automated email
              scanners from consuming your one-time link before you can set a password.
            </p>
            <button
              type="button"
              onClick={handleConfirmInvite}
              disabled={confirming}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {confirming ? "Confirming…" : "Confirm invite"}
            </button>
          </div>
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
        )}
      </div>
    </main>
  );
}
