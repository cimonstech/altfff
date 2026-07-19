"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Existing invited admins only - no public self-registration anywhere.
 * Accounts are created exclusively via the invite flow (app/api/admin/invite),
 * which sends Supabase's own invite email with a link to /admin/set-password.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.user) {
      setError(signInError?.message || "Invalid email or password.");
      setSubmitting(false);
      return;
    }

    // Log the login. RLS ("admins can insert own activity log entries")
    // permits this insert as long as actor_id matches the signed-in user
    // and they already have an admin_profiles row (created by the
    // on_auth_user_created trigger when they were invited).
    const { error: logError } = await supabase.from("activity_logs").insert({
      actor_id: data.user.id,
      actor_email: data.user.email,
      action: "login",
    });
    if (logError) {
      // Non-fatal - a failed audit-log write shouldn't block a real login.
      console.error("Failed to log admin login:", logError);
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-20">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
          Admin Login
        </h1>
        <p className="mt-2 text-sm text-indigo">Sign in with your invited admin account.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
