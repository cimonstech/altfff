"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { SuccessBanner } from "@/components/SuccessBanner";
import { BotProtection } from "@/components/BotProtection";
import NewsletterOptInCheckbox from "@/components/NewsletterOptInCheckbox";
import { VisitorRegistrationFields } from "@/components/VisitorRegistrationFields";
import { RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimitMessages";
import { visitorRegistrationSchema } from "@/lib/validation/visitor";
import { formDataToObject, useZodFormErrors } from "@/lib/validation/useZodFormErrors";
import { useFormSubmitGuard } from "@/lib/useFormSubmitGuard";

type Status = "idle" | "submitting" | "error";

/**
 * Visitor registration form, inline on /visit. Submits to
 * /api/visitor-registrations, shared with the modal (VisitorRegisterForm.tsx).
 */
export default function VisitRegisterForm() {
  const container = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showBanner, setShowBanner] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { fieldErrors, validateField, validateAll, applyServerFieldErrors, clearFieldErrors } =
    useZodFormErrors(visitorRegistrationSchema);
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
      <form
        key={formKey}
        ref={formRef}
        noValidate
        className="visit-form-in flex flex-col gap-1"
        onSubmit={handleSubmit}
      >
        <VisitorRegistrationFields
          idPrefix="visit"
          fieldErrors={fieldErrors}
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

      {showBanner && (
        <SuccessBanner
          message="Registration received. We'll review your request and email you once it's confirmed."
          onDismiss={() => setShowBanner(false)}
        />
      )}
    </div>
  );
}
