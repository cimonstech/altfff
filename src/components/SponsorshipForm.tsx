"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { FloatingField } from "@/components/FormFields";

// ---------------------------------------------------------------------------
// Mailchimp scaffold — TODO before launch:
//
// 1. Open the old altfff.com sponsorship page's Mailchimp embed code.
// 2. Copy the <form action="..."> URL into MAILCHIMP_SPONSOR_URL below.
// 3. Copy each <input name="..."> attribute into MAILCHIMP_FIELDS below —
//    EMAIL is always correct, everything else (FNAME/PHONE/MMERGEn) is
//    specific to this Mailchimp audience and must come from the real embed.
// 4. Copy the hidden honeypot field's name (looks like "b_<u>_<id>") into
//    MAILCHIMP_HONEYPOT_NAME — Mailchimp uses it as an anti-bot trap, and
//    leaving it wrong/missing can get real submissions flagged as spam.
//
// Regular fetch() to a Mailchimp URL is blocked by CORS, so this uses the
// standard workaround: a genuine native <form> POST targeting a hidden
// iframe instead of navigating the page. We can't read the cross-origin
// response, so the hidden iframe's `load` event (after a real submit) is
// the completion signal for the inline success state below.
// ---------------------------------------------------------------------------
const MAILCHIMP_SPONSOR_URL = "REPLACE_WITH_MAILCHIMP_FORM_ACTION_URL";
const MAILCHIMP_FIELDS = {
  email: "EMAIL",
  fullName: "FNAME", // TODO: confirm — audience may split into FNAME + LNAME instead
  phone: "PHONE", // TODO: confirm this audience has a PHONE merge field with this tag
  hearAbout: "MMERGE5", // TODO: replace with the real merge tag
  linkedin: "MMERGE6", // TODO: replace with the real merge tag
  company: "MMERGE7", // TODO: replace with the real merge tag
  jobTitle: "MMERGE8", // TODO: replace with the real merge tag
  businessNature: "MMERGE9", // TODO: replace with the real merge tag
};
const MAILCHIMP_HONEYPOT_NAME = "b_REPLACE_REPLACE_REPLACE"; // TODO: real "b_<u>_<id>" name
const MAILCHIMP_IFRAME_NAME = "sponsor-mailchimp-target";

// Flip to "api" once /api/sponsor exists (a Resend-backed fallback route) —
// everything below branches on this one constant, so swapping transport is
// a one-line change, not a rewrite.
const TRANSPORT: "mailchimp" | "api" = "mailchimp";

async function submitViaApi(form: HTMLFormElement) {
  const formData = new FormData(form);
  await fetch("/api/sponsor", { method: "POST", body: formData });
}

export default function SponsorshipForm() {
  const container = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const hasSubmittedRef = useRef(false);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".sponsor-form-in", {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: container.current, start: "top 78%", once: true },
      });
    },
    { scope: container },
  );

  // Fires once the hidden iframe's document changes — including the very
  // first (harmless, about:blank) load on mount, which the ref guard below
  // ignores so we don't show "submitted" before anyone has submitted.
  const handleIframeLoad = () => {
    if (!hasSubmittedRef.current) return;
    setSubmitting(false);
    setSubmitted(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (TRANSPORT === "mailchimp") {
      // Deliberately NOT calling preventDefault: the native form POST needs
      // to actually fire so the browser submits it (targeting the hidden
      // iframe below), which is what sidesteps Mailchimp's CORS block.
      hasSubmittedRef.current = true;
      setSubmitting(true);
      return;
    }
    e.preventDefault();
    setSubmitting(true);
    await submitViaApi(e.currentTarget);
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="sponsor-form-in rounded-xl border border-hairline bg-surface p-8 text-center">
        <p className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
          Thank you.
        </p>
        <p className="mt-2 text-sm text-indigo">
          A member of our team will be in touch.
        </p>
      </div>
    );
  }

  return (
    <>
      {TRANSPORT === "mailchimp" && (
        <iframe
          name={MAILCHIMP_IFRAME_NAME}
          title="Sponsorship form submission target"
          style={{ display: "none" }}
          onLoad={handleIframeLoad}
        />
      )}
      <form
        ref={container}
        className="sponsor-form-in flex flex-col gap-1"
        action={TRANSPORT === "mailchimp" ? MAILCHIMP_SPONSOR_URL : undefined}
        method="POST"
        target={TRANSPORT === "mailchimp" ? MAILCHIMP_IFRAME_NAME : undefined}
        onSubmit={handleSubmit}
      >
        <FloatingField id="email" name={MAILCHIMP_FIELDS.email} label="Email Address" required type="email" />
        <FloatingField id="fullName" name={MAILCHIMP_FIELDS.fullName} label="Full Name" required />
        <FloatingField id="phone" name={MAILCHIMP_FIELDS.phone} label="Phone Number" required type="tel" />
        <FloatingField id="hearAbout" name={MAILCHIMP_FIELDS.hearAbout} label="Where did you hear about Alt.FFF?" required />
        <FloatingField id="linkedin" name={MAILCHIMP_FIELDS.linkedin} label="Share your LinkedIn handle" required />
        <FloatingField id="company" name={MAILCHIMP_FIELDS.company} label="Company Name" required />
        <FloatingField id="jobTitle" name={MAILCHIMP_FIELDS.jobTitle} label="Job Title" required />
        <FloatingField
          id="businessNature"
          name={MAILCHIMP_FIELDS.businessNature}
          label="What is the nature of your business?"
          required
        />

        <label className="mt-5 flex items-start gap-2.5 text-xs leading-relaxed text-ink/80">
          <input type="checkbox" name="newsletter" className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline" />
          Tick the box if you would like to receive email updates regarding
          the Alt.FFF event.
        </label>

        {/* Mailchimp anti-bot honeypot — must stay empty and off-screen,
            never remove or let a real user fill it in. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-5000px" }}>
          <input type="text" name={MAILCHIMP_HONEYPOT_NAME} tabIndex={-1} defaultValue="" />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Submit"}
        </button>
      </form>
    </>
  );
}
