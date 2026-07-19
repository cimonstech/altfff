"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { FloatingField } from "@/components/FormFields";
import { PhoneInput } from "@/components/PhoneInput";
import { SuccessBanner } from "@/components/SuccessBanner";

type Status = "idle" | "submitting" | "error";

/**
 * Sponsorship enquiry form. Submits to /api/sponsor-inquiries, matching the
 * pattern already proven in ContactForm.tsx.
 */
export default function SponsorshipForm() {
  // Deliberately a wrapping div, not the <form> itself - a useGSAP scope
  // only ever matches DESCENDANTS of its scope root, never the root node
  // itself. Scoping to the form while also animating it via
  // `.sponsor-form-in` (the form's own class) meant the target could never
  // be found - confirmed as the same bug already found and fixed in
  // ContactForm.tsx.
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showBanner, setShowBanner] = useState(false);
  // Bumped on every successful submit to force the <form> below to fully
  // remount - the simplest reliable way to reset both native uncontrolled
  // inputs AND PhoneInput/FloatingField's own internal state back to empty.
  const [formKey, setFormKey] = useState(0);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/sponsor-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setErrorMessage(body.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("idle");
      setShowBanner(true);
      setFormKey((k) => k + 1);
    } catch {
      setErrorMessage("Something went wrong. Please check your connection and try again.");
      setStatus("error");
    }
  };

  return (
    <div ref={container}>
      {showBanner && (
        <SuccessBanner message="Thank you. A member of our team will be in touch." onDismiss={() => setShowBanner(false)} />
      )}
      <form
        key={formKey}
        className="sponsor-form-in flex flex-col gap-1"
        onSubmit={handleSubmit}
      >
        <FloatingField id="email" label="Email Address" required type="email" />
        <FloatingField id="fullName" label="Full Name" required />
        <PhoneInput id="phone" label="Phone Number" required />
        <FloatingField id="hearAbout" label="Where did you hear about Alt.FFF?" required />
        <FloatingField id="linkedin" label="Share your LinkedIn handle" required />
        <FloatingField id="company" label="Company Name" required />
        <FloatingField id="jobTitle" label="Job Title" required />
        <FloatingField id="businessNature" label="What is the nature of your business?" required />

        <label className="mt-5 flex items-start gap-2.5 text-xs leading-relaxed text-ink/80">
          <input type="checkbox" name="newsletter" className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline" />
          Tick the box if you would like to receive email updates regarding
          the Alt.FFF event.
        </label>

        {/* Honeypot - hidden from real users via CSS, matching
            ContactForm.tsx's implementation. Named "website", not "company",
            since this form already has a real "company" field. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-5000px" }}>
          <input type="text" name="website" tabIndex={-1} defaultValue="" />
        </div>

        {status === "error" && (
          <p className="mt-3 text-sm text-madder" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
