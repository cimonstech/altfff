"use client";

import { useRef, useState } from "react";
import { FloatingField } from "@/components/FormFields";
import EmailFloatingField from "@/components/EmailFloatingField";
import { PhoneInput } from "@/components/PhoneInput";
import { SuccessBanner } from "@/components/SuccessBanner";
import { BotProtection } from "@/components/BotProtection";
import NewsletterOptInCheckbox from "@/components/NewsletterOptInCheckbox";
import { RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimitMessages";
import { walkInRegistrationSchema } from "@/lib/validation/walkIn";
import { formDataToObject, useZodFormErrors } from "@/lib/validation/useZodFormErrors";
import { useFormSubmitGuard } from "@/lib/useFormSubmitGuard";

type Status = "idle" | "submitting" | "error";

export default function WalkInRegisterForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showBanner, setShowBanner] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { fieldErrors, validateField, validateAll, applyServerFieldErrors, clearFieldErrors } =
    useZodFormErrors(walkInRegistrationSchema);
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
    clearFieldErrors();

    try {
      const res = await fetch("/api/walk-in-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        fieldErrors?: Record<string, string>;
      };

      if (res.status === 429) {
        setStatus("error");
        setErrorMessage(json.error || RATE_LIMIT_ERROR_MESSAGE);
        endSubmit();
        return;
      }

      if (json.fieldErrors) {
        applyServerFieldErrors(json.fieldErrors);
        setStatus("error");
        setErrorMessage(json.error || "Please fix the highlighted fields.");
        endSubmit();
        return;
      }

      if (!res.ok || !json.ok) {
        setStatus("error");
        setErrorMessage(json.error || "Something went wrong. Please try again or ask staff for help.");
        endSubmit();
        return;
      }

      setShowBanner(true);
      setFormKey((k) => k + 1);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Network error — please check your connection and try again.");
    } finally {
      endSubmit();
    }
  };

  return (
    <>
      {showBanner && (
        <SuccessBanner
          message="You're registered — welcome to Alt.FFF. A confirmation has been sent to your email and phone."
          onDismiss={() => setShowBanner(false)}
        />
      )}

      <form
        key={formKey}
        ref={formRef}
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4"
        noValidate
      >
        <FloatingField
          id="walk-in-name"
          name="full_name"
          label="Full name"
          required
          error={fieldErrors.full_name}
          onBlurValidate={onBlurValidate}
        />

        <EmailFloatingField
          id="walk-in-email"
          name="email"
          label="Email"
          required
          error={fieldErrors.email}
          onBlurValidate={onBlurValidate}
        />

        <PhoneInput
          id="walk-in-phone"
          name="phone"
          label="Phone"
          required
          error={fieldErrors.phone}
          onBlurValidate={onBlurValidate}
        />

        <FloatingField
          id="walk-in-company"
          name="company_name"
          label="Company / what you do (optional)"
          error={fieldErrors.company_name}
          onBlurValidate={onBlurValidate}
        />

        <NewsletterOptInCheckbox />

        <BotProtection />

        {errorMessage && (
          <p className="rounded-md border border-madder/30 bg-madder/10 px-4 py-3 text-sm text-madder" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-bold uppercase tracking-wide text-paper hover:opacity-90 disabled:opacity-60"
        >
          {status === "submitting" ? "Registering…" : "Register & enter"}
        </button>
      </form>
    </>
  );
}
