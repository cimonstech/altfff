import { FORM_CLOSED_MESSAGE } from "@/lib/appSettings";

/** Shared alert styling for closed-form notices (inline + modal). */
export const FORM_CLOSED_NOTICE_CLASS =
  "rounded-xl border border-[#d64545] bg-[#fde8e8] px-5 py-4 text-sm font-semibold leading-relaxed text-[#7a1212]";

/** Inline closed notice for /visit and /sponsorship when a form toggle is off. */
export function PublicFormsClosedNotice({ className = "" }: { className?: string }) {
  return (
    <div role="status" className={`${FORM_CLOSED_NOTICE_CLASS} ${className}`}>
      {FORM_CLOSED_MESSAGE}
    </div>
  );
}

/** Modal body when exhibitor CTAs are clicked while that form is closed. */
export function PublicFormsClosedModalContent({ headingId }: { headingId: string }) {
  return (
    <div className="px-6 pb-8 pt-12">
      <h2
        id={headingId}
        className="font-display text-xl font-extrabold uppercase tracking-tight text-ink md:text-2xl"
      >
        Applications closed
      </h2>
      <div className={`mt-5 ${FORM_CLOSED_NOTICE_CLASS}`}>{FORM_CLOSED_MESSAGE}</div>
    </div>
  );
}
