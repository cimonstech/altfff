"use client";

import { FloatingField } from "@/components/FormFields";

/**
 * Visitor registration form — rendered as the shared Modal's content when
 * opened from any "Register to visit" / "Register for event" CTA.
 *
 * Fields are placeholders pending real confirmation from Fashion Forum
 * Africa — do not treat as final. Visual-only, same as the exhibitor
 * form: no real backend submission wired up yet.
 */
export default function VisitorRegisterForm({ headingId }: { headingId?: string }) {
  return (
    <div className="p-6 md:p-8">
      <h2 id={headingId} className="pr-8 font-display text-lg font-extrabold uppercase tracking-tight text-ink">
        Register to Visit Alt.FFF
      </h2>
      <p className="mt-2 text-sm text-indigo">
        Join us September 17–19, 2026 in Accra. Fields below are placeholders
        pending confirmation from Fashion Forum Africa.
      </p>

      {/* Visual-only: no submission wiring yet, same caveat as the
          exhibitor form. */}
      <form className="mt-2 flex flex-col gap-1" onSubmit={(e) => e.preventDefault()}>
        <FloatingField id="visitor-name" label="Full Name" />
        <FloatingField id="visitor-email" label="Email Address" required type="email" />
        <FloatingField id="visitor-phone" label="Phone Number" type="tel" />
        <FloatingField id="visitor-attending" label="Number Attending" />
        <FloatingField id="visitor-hear" label="How did you hear about Alt.FFF?" />

        <button
          type="submit"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
        >
          Register
        </button>
      </form>
    </div>
  );
}
