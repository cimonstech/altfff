"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { FloatingField, FloatingTextarea } from "@/components/FormFields";
import { PhoneInput } from "@/components/PhoneInput";
import { SuccessBanner } from "@/components/SuccessBanner";
import { BotProtection } from "@/components/BotProtection";

type Status = "idle" | "submitting" | "error";

export default function ContactForm() {
  // Deliberately a wrapping div, not the <form> itself - see the
  // useGSAP call below for why the scope root and the animated element
  // can never be the same node.
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showBanner, setShowBanner] = useState(false);
  // Bumped on every successful submit to force the <form> below to fully
  // remount - the simplest reliable way to reset both native uncontrolled
  // inputs AND PhoneInput/FloatingField's own internal state (floating
  // label "filled" flag, PhoneInput's parsed value) back to empty, since
  // neither accepts a controlled `value` prop from here.
  const [formKey, setFormKey] = useState(0);

  // BUG (fixed here): this used to scope useGSAP to the <form> element via
  // `ref={container}` on the form itself, then try to animate that same
  // element with `gsap.from(".contact-form-in", ...)`. A scoped selector
  // only ever searches DESCENDANTS of the scope root - never the root
  // itself - so ".contact-form-in" could never match anything as long as
  // the ref and the class lived on the same node. That produced the
  // reproducible "GSAP target .contact-form-in not found" console warning
  // on every load. Under certain effect-timing conditions (the ref not yet
  // populated when GSAP's own scoped-selector closure ran) it also hit
  // GSAP's "Invalid scope" fallback path, which substitutes a detached
  // dummy element for the scope - guaranteeing the same lookup fails a
  // second way. Neither ever threw (GSAP's `_warn()` is just
  // `console.warn`, confirmed by reading its source and by reproducing
  // this exact warning across multiple real page loads while the form's
  // onSubmit still fired and the request still reached the API every
  // time) - so this was a real animation bug, not what was blocking
  // submissions. Fixed by moving the ref to a wrapping element, so
  // ".contact-form-in" (on the form/success-state div) is now a genuine
  // descendant of the scope, matching the pattern already used correctly
  // elsewhere (ContactHero.tsx, ContactFAQ.tsx).
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".contact-form-in", {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: container.current, start: "top 80%", once: true },
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
      const res = await fetch("/api/contact", {
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
        <SuccessBanner
          message="Message sent. Thank you for reaching out - our team will get back to you shortly."
          onDismiss={() => setShowBanner(false)}
        />
      )}
      <form key={formKey} className="contact-form-in flex flex-col gap-1" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-x-4">
          <FloatingField id="firstName" label="First Name" required />
          <FloatingField id="lastName" label="Last Name" required />
        </div>
        <FloatingField id="email" label="Email" required type="email" />
        <PhoneInput id="phone" label="Phone" />
        <FloatingTextarea id="message" label="Message" required rows={5} />

        <BotProtection />

        {status === "error" && (
          <p className="mt-3 text-sm text-madder" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}


