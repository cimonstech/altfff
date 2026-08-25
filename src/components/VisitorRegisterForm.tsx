"use client";

import { useRef, useState } from "react";
import { FloatingField } from "@/components/FormFields";
import EmailFloatingField from "@/components/EmailFloatingField";
import { BrandName } from "@/components/BrandName";
import { PhoneInput } from "@/components/PhoneInput";
import { SuccessBanner } from "@/components/SuccessBanner";
import { BotProtection } from "@/components/BotProtection";
import NewsletterOptInCheckbox from "@/components/NewsletterOptInCheckbox";
import { RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimitMessages";
import { EVENT } from "@/lib/constants";
import { visitorRegistrationSchema } from "@/lib/validation/visitor";
import { formDataToObject, useZodFormErrors } from "@/lib/validation/useZodFormErrors";
import { useFormSubmitGuard } from "@/lib/useFormSubmitGuard";

type Status = "idle" | "submitting" | "error";

/**
 * Visitor registration form - rendered as the shared Modal's content when
 * opened from any "Register to visit" CTA. Submits
 * to /api/visitor-registrations, shared with the fuller inline form on
 * /visit (VisitRegisterForm.tsx) - both use the same canonical field names
 * so that one route can handle either submission shape.
 */
export default function VisitorRegisterForm({ headingId }: { headingId?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showBanner, setShowBanner] = useState(false);
  // Bumped on every successful submit to force the <form> below to fully
  // remount - the simplest reliable way to reset both native uncontrolled
  // inputs AND PhoneInput/FloatingField's own internal state back to empty.
  const [formKey, setFormKey] = useState(0);
  const { fieldErrors, validateField, validateAll, applyServerFieldErrors, clearFieldErrors } =
    useZodFormErrors(visitorRegistrationSchema);
  const { beginSubmit, endSubmit } = useFormSubmitGuard();

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
    <div className="p-6 md:p-8">
      <h2 id={headingId} className="pr-8 font-display text-lg font-extrabold uppercase tracking-tight text-ink">
        Register to Visit <BrandName />
      </h2>
      <p className="mt-2 text-sm text-indigo">Join us {EVENT.tradeFairDateLabel} in Accra.</p>

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
        className="mt-2 flex flex-col gap-1"
        onSubmit={handleSubmit}
      >
        <FloatingField
          id="visitor-name"
          name="full_name"
          label="Full Name"
          required
          error={fieldErrors.full_name}
          onBlurValidate={onBlurValidate}
        />
        <EmailFloatingField
          id="visitor-email"
          name="email"
          label="Email Address"
          required
          error={fieldErrors.email}
          onBlurValidate={onBlurValidate}
        />
        <PhoneInput
          id="visitor-phone"
          name="phone"
          label="Phone Number"
          error={fieldErrors.phone}
          onBlurValidate={onBlurValidate}
        />
        <FloatingField
          id="visitor-attending"
          name="number_attending"
          label="Number Attending"
          error={fieldErrors.number_attending}
          onBlurValidate={onBlurValidate}
        />
        <FloatingField
          id="visitor-hear"
          name="heard_about_us"
          label="How did you hear about Alt.FFF?"
          error={fieldErrors.heard_about_us}
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
          {status === "submitting" ? "Sending…" : "Register"}
        </button>
      </form>
    </div>
  );
}
