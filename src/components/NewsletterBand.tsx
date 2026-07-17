"use client";

import { EVENT } from "@/lib/constants";

/**
 * Newsletter signup block - visual only for now, no submission wiring.
 * Extracted out of Footer.tsx (which renders it bare, as one column of
 * its own grid) so pages that want it as a standalone section can reuse
 * it too; the caller controls surrounding layout/background/padding.
 *
 * `fieldId` defaults to "newsletter-email" but must be overridden if this
 * ever renders twice on the same page (e.g. a standalone band above a
 * Footer that also renders one) - otherwise the input id/label pairing
 * collides.
 */
export default function NewsletterBand({ fieldId = "newsletter-email" }: { fieldId?: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold uppercase text-ink">
        Stay in the weave
      </h2>
      <p className="mt-2 max-w-[42ch] text-sm text-indigo">
        News on exhibitors, programming and tickets for {EVENT.dates}.
      </p>
      <form
        className="mt-6 flex max-w-md gap-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor={fieldId} className="sr-only">
          Email address
        </label>
        <input
          id={fieldId}
          type="email"
          placeholder="you@studio.com"
          className="w-full rounded-full border border-hairline bg-surface px-5 py-3 text-sm text-ink placeholder:text-ink/40"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
        >
          Sign up
        </button>
      </form>
    </div>
  );
}


