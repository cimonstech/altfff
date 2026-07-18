"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { FloatingField, FloatingSelect } from "@/components/FormFields";

// ---------------------------------------------------------------------------
// Mailchimp scaffold - TODO before launch, same pattern as SponsorshipForm:
//
// 1. Open the old altfff.com visitor-registration page's Mailchimp embed
//    code.
// 2. Copy the <form action="..."> URL into MAILCHIMP_VISIT_URL below.
// 3. Copy each <input name="..."> attribute into MAILCHIMP_FIELDS below -
//    EMAIL is always correct, everything else (FNAME/PHONE/MMERGEn) is
//    specific to this Mailchimp audience and must come from the real embed.
// 4. Copy the hidden honeypot field's name (looks like "b_<u>_<id>") into
//    MAILCHIMP_HONEYPOT_NAME.
//
// Regular fetch() to a Mailchimp URL is blocked by CORS, so this uses the
// standard workaround: a genuine native <form> POST targeting a hidden
// iframe instead of navigating the page.
// ---------------------------------------------------------------------------
const MAILCHIMP_VISIT_URL = "REPLACE_WITH_MAILCHIMP_FORM_ACTION_URL";
const MAILCHIMP_FIELDS = {
  email: "EMAIL",
  fullName: "FNAME", // TODO: confirm - audience may split into FNAME + LNAME instead
  phone: "PHONE",
  company: "MMERGE5", // TODO: replace with the real merge tag
  jobTitle: "MMERGE6", // TODO: replace with the real merge tag
  country: "MMERGE7", // TODO: replace with the real merge tag
  interest: "MMERGE8", // TODO: replace with the real merge tag
  hearAbout: "MMERGE9", // TODO: replace with the real merge tag
};
const MAILCHIMP_HONEYPOT_NAME = "b_REPLACE_REPLACE_REPLACE"; // TODO: real "b_<u>_<id>" name
const MAILCHIMP_IFRAME_NAME = "visit-mailchimp-target";

// Flip to "api" once /api/visit exists (a Resend-backed fallback route) -
// everything below branches on this one constant, same as SponsorshipForm.
const TRANSPORT: "mailchimp" | "api" = "mailchimp";

const INTEREST_OPTIONS = [
  { value: "materials", text: "Discovering New Materials & Innovation" },
  { value: "leaders", text: "Connecting With Industry Leaders" },
  { value: "learning", text: "Learning From Experts" },
  { value: "business", text: "Finding New Business Opportunities" },
  { value: "other", text: "Other" },
];

async function submitViaApi(form: HTMLFormElement) {
  const formData = new FormData(form);
  await fetch("/api/visit", { method: "POST", body: formData });
}

export default function VisitRegisterForm() {
  const container = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const hasSubmittedRef = useRef(false);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".visit-form-in", {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: container.current, start: "top 78%", once: true },
      });
    },
    { scope: container },
  );

  // Fires once the hidden iframe's document changes - including the very
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
      <div className="visit-form-in rounded-xl border border-hairline bg-surface p-8 text-center">
        <p className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
          Thank you.
        </p>
        <p className="mt-2 text-sm text-indigo">
          Your badge will be emailed to you closer to the event.
        </p>
      </div>
    );
  }

  return (
    <>
      {TRANSPORT === "mailchimp" && (
        <iframe
          name={MAILCHIMP_IFRAME_NAME}
          title="Visitor registration submission target"
          style={{ display: "none" }}
          onLoad={handleIframeLoad}
        />
      )}
      <form
        ref={container}
        className="visit-form-in flex flex-col gap-1"
        action={TRANSPORT === "mailchimp" ? MAILCHIMP_VISIT_URL : undefined}
        method="POST"
        target={TRANSPORT === "mailchimp" ? MAILCHIMP_IFRAME_NAME : undefined}
        onSubmit={handleSubmit}
      >
        <FloatingField id="visit-email" name={MAILCHIMP_FIELDS.email} label="Email Address" required type="email" />
        <FloatingField id="visit-fullName" name={MAILCHIMP_FIELDS.fullName} label="Full Name" required />
        <FloatingField id="visit-phone" name={MAILCHIMP_FIELDS.phone} label="Phone Number" type="tel" />
        <FloatingField id="visit-company" name={MAILCHIMP_FIELDS.company} label="Company Name" />
        <FloatingField id="visit-jobTitle" name={MAILCHIMP_FIELDS.jobTitle} label="Job Title" />
        <FloatingField id="visit-country" name={MAILCHIMP_FIELDS.country} label="Country" />
        <FloatingSelect
          id="visit-interest"
          label="I am interested in"
          options={INTEREST_OPTIONS}
        />
        <FloatingField
          id="visit-hearAbout"
          name={MAILCHIMP_FIELDS.hearAbout}
          label="Where did you hear about Alt.FFF?"
        />

        {/* Mailchimp anti-bot honeypot - must stay empty and off-screen,
            never remove or let a real user fill it in. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-5000px" }}>
          <input type="text" name={MAILCHIMP_HONEYPOT_NAME} tabIndex={-1} defaultValue="" />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Submit"}
        </button>
      </form>
    </>
  );
}
