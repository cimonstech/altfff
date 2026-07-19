"use client";

import { useState } from "react";
import { FloatingField } from "@/components/FormFields";
import { PhoneInput } from "@/components/PhoneInput";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Visitor registration form - rendered as the shared Modal's content when
 * opened from any "Register to visit" / "Register for event" CTA. Submits
 * to /api/visitor-registrations, shared with the fuller inline form on
 * /visit (VisitRegisterForm.tsx) - both use the same canonical field names
 * so that one route can handle either submission shape.
 */
export default function VisitorRegisterForm({ headingId }: { headingId?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
      <div className="p-6 text-center md:p-8">
        <p className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
          You&apos;re registered.
        </p>
        <p className="mt-2 text-sm text-indigo">
          Thanks for registering to visit Alt.FFF - we look forward to seeing you there.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <h2 id={headingId} className="pr-8 font-display text-lg font-extrabold uppercase tracking-tight text-ink">
        Register to Visit Alt.FFF
      </h2>
      <p className="mt-2 text-sm text-indigo">Join us September 17–19, 2026 in Accra.</p>

      <form className="mt-2 flex flex-col gap-1" onSubmit={handleSubmit}>
        <FloatingField id="visitor-name" name="full_name" label="Full Name" />
        <FloatingField id="visitor-email" name="email" label="Email Address" required type="email" />
        <PhoneInput id="visitor-phone" name="phone" label="Phone Number" />
        <FloatingField id="visitor-attending" name="number_attending" label="Number Attending" />
        <FloatingField id="visitor-hear" name="heard_about_us" label="How did you hear about Alt.FFF?" />

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
          className="mt-5 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Register"}
        </button>
      </form>
    </div>
  );
}
