import Link from "next/link";
import { Lock } from "lucide-react";

/** Shown when a regular admin reaches a super_admin-only route. */
export default function PermissionDenied() {
  return (
    <main className="flex min-h-[50vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-madder/10 text-madder">
          <Lock className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight text-ink">Access denied</h1>
        <p className="mt-3 text-sm leading-relaxed text-indigo">
          This area is restricted to super admins. If you believe you should have access, contact a super admin on your
          team.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
