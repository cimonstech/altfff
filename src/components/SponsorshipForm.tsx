"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { FloatingField, FloatingSelect } from "@/components/FormFields";
import EmailFloatingField from "@/components/EmailFloatingField";
import NewsletterOptInCheckbox from "@/components/NewsletterOptInCheckbox";
import { PhoneInput } from "@/components/PhoneInput";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { SuccessBanner } from "@/components/SuccessBanner";
import { BotProtection } from "@/components/BotProtection";
import { RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimitMessages";
import { sponsorInquirySchema } from "@/lib/validation/sponsor";
import { formDataToObject, useZodFormErrors } from "@/lib/validation/useZodFormErrors";

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
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showBanner, setShowBanner] = useState(false);
  // Bumped on every successful submit to force the <form> below to fully
  // remount - the simplest reliable way to reset both native uncontrolled
  // inputs AND PhoneInput/FloatingField's own internal state back to empty.
  const [formKey, setFormKey] = useState(0);
  const { fieldErrors, validateField, validateAll, applyServerFieldErrors, clearFieldErrors } =
    useZodFormErrors(sponsorInquirySchema);

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

  const onBlurValidate = (field: string) => {
    if (!formRef.current) return;
    validateField(field, formDataToObject(formRef.current));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    const data = formDataToObject(e.currentTarget);
    const check = validateAll(data);
    if (!check.ok) {
      setStatus("idle");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/sponsor-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (res.status === 429) {
        setErrorMessage(
          (typeof body.error === "string" && body.error) || RATE_LIMIT_ERROR_MESSAGE,
        );
        setStatus("error");
        return;
      }
      if (res.status === 400 && body.fieldErrors && typeof body.fieldErrors === "object") {
        applyServerFieldErrors(body.fieldErrors as Record<string, string>);
        setStatus("idle");
        return;
      }
      if (!res.ok || !body.ok) {
        setErrorMessage(body.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("idle");
      setShowBanner(true);
      clearFieldErrors();
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
        ref={formRef}
        noValidate
        className="sponsor-form-in flex flex-col gap-1"
        onSubmit={handleSubmit}
      >
        <EmailFloatingField
          id="email"
          label="Email Address"
          required
          error={fieldErrors.email}
          onBlurValidate={onBlurValidate}
        />
        <FloatingField
          id="fullName"
          label="Full Name"
          required
          error={fieldErrors.fullName}
          onBlurValidate={onBlurValidate}
        />
        <PhoneInput
          id="phone"
          label="Phone Number"
          required
          error={fieldErrors.phone}
          onBlurValidate={onBlurValidate}
        />
        <FloatingField
          id="hearAbout"
          label="Where did you hear about Alt.FFF?"
          required
          error={fieldErrors.hearAbout}
          onBlurValidate={onBlurValidate}
        />
        <FloatingField
          id="linkedin"
          label="Share your LinkedIn handle"
          required
          error={fieldErrors.linkedin}
          onBlurValidate={onBlurValidate}
        />
        <FloatingField
          id="company"
          label="Company Name"
          required
          error={fieldErrors.company}
          onBlurValidate={onBlurValidate}
        />
        <FloatingField
          id="jobTitle"
          label="Job Title"
          required
          error={fieldErrors.jobTitle}
          onBlurValidate={onBlurValidate}
        />
        <FloatingSelect
          id="country"
          label="Country"
          options={COUNTRY_OPTIONS}
          error={fieldErrors.country}
          onBlurValidate={onBlurValidate}
        />
        <FloatingField
          id="businessNature"
          label="What is the nature of your business?"
          required
          error={fieldErrors.businessNature}
          onBlurValidate={onBlurValidate}
        />

        <NewsletterOptInCheckbox />

        <BotProtection />

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
