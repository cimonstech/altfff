/** Matches SponsorshipForm.tsx - shared across all opt-in forms. */
export default function NewsletterOptInCheckbox() {
  return (
    <label className="mt-5 flex items-start gap-2.5 text-xs leading-relaxed text-ink/80">
      <input type="checkbox" name="newsletter" className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline" />
      By ticking this box you agree to receive email updates regarding the Alt.FFF Event.
    </label>
  );
}
