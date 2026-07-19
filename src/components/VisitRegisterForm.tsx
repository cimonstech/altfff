"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { FloatingField, FloatingSelect } from "@/components/FormFields";

const INTEREST_OPTIONS = [
  { value: "materials", text: "Discovering New Materials & Innovation" },
  { value: "leaders", text: "Connecting With Industry Leaders" },
  { value: "learning", text: "Learning From Experts" },
  { value: "business", text: "Finding New Business Opportunities" },
  { value: "other", text: "Other" },
];

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Visitor registration form, inline on /visit. Submits to
 * /api/visitor-registrations, shared with the quick modal
 * (VisitorRegisterForm.tsx) - both use the same canonical field names so
 * that one route can handle either submission shape.
 */
export default function VisitRegisterForm() {
  const container = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/visitor-registrations", {
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
      setStatus("success");
    } catch {
      setErrorMessage("Something went wrong. Please check your connection and try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
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
    <form
      ref={container}
      className="visit-form-in flex flex-col gap-1"
      onSubmit={handleSubmit}
    >
      <FloatingField id="visit-email" name="email" label="Email Address" required type="email" />
      <FloatingField id="visit-fullName" name="full_name" label="Full Name" required />
      <FloatingField id="visit-phone" name="phone" label="Phone Number" type="tel" />
      <FloatingField id="visit-company" name="company_name" label="Company Name" />
      <FloatingField id="visit-jobTitle" name="job_title" label="Job Title" />
      <FloatingField id="visit-country" name="country" label="Country" />
      <FloatingSelect id="visit-interest" name="interest" label="I am interested in" options={INTEREST_OPTIONS} />
      <FloatingField id="visit-hearAbout" name="heard_about_us" label="Where did you hear about Alt.FFF?" />

      {/* Honeypot - hidden from real users via CSS, matching
          ContactForm.tsx's implementation. */}
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
        className="mt-5 inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-85 disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}
