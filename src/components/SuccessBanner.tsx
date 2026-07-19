"use client";

import { useEffect } from "react";

const AUTO_DISMISS_MS = 9000;

/**
 * Shared success banner for the site's five submission forms - shown above
 * the form on a successful submit, while the form itself stays visible and
 * resets for a fresh entry (see each form's `formKey` reset pattern). Forest
 * reads as this site's established "success" tone (already used that way in
 * the admin communications history view), so it's used here rather than
 * gold, which is the brand/accent color rather than a status color.
 *
 * Dismisses two ways - whichever the admin/visitor reaches for first: the
 * close button, or automatically after a short delay so it never sits
 * there blocking layout indefinitely.
 */
export function SuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="relative mb-4 flex items-start gap-3 rounded-xl border border-forest bg-forest/10 p-4 pr-11 text-sm text-forest"
    >
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-forest/70 transition-colors hover:bg-forest/10 hover:text-forest"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M1 1 L15 15 M15 1 L1 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
