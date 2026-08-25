"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { FloatingField, FloatingSelect } from "@/components/FormFields";
import EmailFloatingField from "@/components/EmailFloatingField";
import { PhoneInput } from "@/components/PhoneInput";
import { SelectWithOtherFollowUp } from "@/components/SelectWithOtherFollowUp";
import { COUNTRY_OPTIONS, COUNTRY_OTHER_VALUE } from "@/lib/countries";
import { HEARD_ABOUT_OPTIONS, HEARD_ABOUT_OTHER_VALUE } from "@/lib/heardAboutSources";
import { SuccessBanner } from "@/components/SuccessBanner";
import { BotProtection } from "@/components/BotProtection";
import NewsletterOptInCheckbox from "@/components/NewsletterOptInCheckbox";
import { RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimitMessages";
import { visitPageRegistrationSchema } from "@/lib/validation/visitor";
import { formDataToObject, useZodFormErrors } from "@/lib/validation/useZodFormErrors";
import { useFormSubmitGuard } from "@/lib/useFormSubmitGuard";

const INTEREST_OPTIONS = [
  { value: "materials", text: "Discovering New Materials & Innovation" },
  { value: "leaders", text: "Connecting With Industry Leaders" },
  { value: "learning", text: "Learning From Experts" },
  { value: "business", text: "Finding New Business Opportunities" },
  { value: "other", text: "Other" },
];

type Status = "idle" | "submitting" | "error";

/**
 * Visitor registration form, inline on /visit. Submits to
 * /api/visitor-registrations, shared with the quick modal
 * (VisitorRegisterForm.tsx) - both use the same canonical field names so
 * that one route can handle either submission shape.
 */
export default function VisitRegisterForm() {
  // Deliberately a wrapping div, not the <form> itself - a useGSAP scope
  // only ever matches DESCENDANTS of its scope root, never the root node
  // itself. Scoping to the form while also animating it via
  // `.visit-form-in` (the form's own class) meant the target could never
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
    useZodFormErrors(visitPageRegistrationSchema);
  const { beginSubmit, endSubmit } = useFormSubmitGuard();

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

  const onBlurValidate = (field: string) => {
    if (!formRef.current) return;
    validateField(field, formDataToObject(formRef.current));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    if (!beginSubmit()) return;

    const data = formDataToObject(e.currentTarget);
    const check = validateAll(data);
    if (!check.ok) {
      setStatus("idle");
      endSubmit();
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/visitor-registrations", {
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
      if (res.status === 409) {
        setErrorMessage(
          (typeof body.error === "string" && body.error) ||
            "You've already registered with this email — we'll be in touch.",
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
    } finally {
      endSubmit();
    }
  };

  return (
    <div ref={container}>
      {showBanner && (
        <SuccessBanner
          message="Registration received. We'll review your request and email you once it's confirmed."
          onDismiss={() => setShowBanner(false)}
        />
      )}
      <form
        key={formKey}
        ref={formRef}
        noValidate
        className="visit-form-in flex flex-col gap-1"
        onSubmit={handleSubmit}
      >
        <EmailFloatingField
          id="visit-email"
          name="email"
          label="Email Address"
          required
          error={fieldErrors.email}
          onBlurValidate={onBlurValidate}
        />
        <FloatingField
          id="visit-fullName"
          name="full_name"
          label="Full Name"
          required
          error={fieldErrors.full_name}
          onBlurValidate={onBlurValidate}
        />
        <PhoneInput
          id="visit-phone"
          name="phone"
          label="Phone Number"
          error={fieldErrors.phone}
          onBlurValidate={onBlurValidate}
        />
        <FloatingField
          id="visit-company"
          name="company_name"
          label="Company Name"
          error={fieldErrors.company_name}
          onBlurValidate={onBlurValidate}
        />
        <FloatingField
          id="visit-jobTitle"
          name="job_title"
          label="Job Title"
          error={fieldErrors.job_title}
          onBlurValidate={onBlurValidate}
        />
        <SelectWithOtherFollowUp
          selectId="visit-country"
          selectName="country"
          selectLabel="Country"
          selectOptions={COUNTRY_OPTIONS}
          otherId="visit-country-other"
          otherName="country_other"
          otherLabel="Please specify your country"
          otherValue={COUNTRY_OTHER_VALUE}
          selectError={fieldErrors.country}
          otherError={fieldErrors.country_other}
          onBlurValidate={onBlurValidate}
        />
        <FloatingSelect
          id="visit-interest"
          name="interest"
          label="I am interested in"
          options={INTEREST_OPTIONS}
          error={fieldErrors.interest}
          onBlurValidate={onBlurValidate}
        />
        <SelectWithOtherFollowUp
          selectId="visit-hearAbout"
          selectName="heard_about_us"
          selectLabel="Where did you hear about Alt.FFF?"
          selectOptions={HEARD_ABOUT_OPTIONS}
          otherId="visit-hearAbout-other"
          otherName="heard_about_us_other"
          otherLabel="Please tell us how you heard about Alt.FFF"
          otherValue={HEARD_ABOUT_OTHER_VALUE}
          selectError={fieldErrors.heard_about_us}
          otherError={fieldErrors.heard_about_us_other}
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
          className="mt-5 inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
