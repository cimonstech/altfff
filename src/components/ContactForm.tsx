"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { FloatingField, FloatingTextarea } from "@/components/FormFields";
import { PhoneInput } from "@/components/PhoneInput";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const container = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
      setStatus("success");
    } catch {
      setErrorMessage("Something went wrong. Please check your connection and try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="contact-form-in rounded-xl border border-hairline bg-surface p-8 text-center">
        <p className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
          Message sent.
        </p>
        <p className="mt-2 text-sm text-indigo">
          Thank you for reaching out - our team will get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form ref={container} className="contact-form-in flex flex-col gap-1" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-x-4">
        <FloatingField id="firstName" label="First Name" required />
        <FloatingField id="lastName" label="Last Name" required />
      </div>
      <FloatingField id="email" label="Email" required type="email" />
      <PhoneInput id="phone" label="Phone" />
      <FloatingTextarea id="message" label="Message" required rows={5} />

      {/* Honeypot - hidden from real users via CSS, never via
          display:none/hidden (some bots skip those specifically). Left
          empty by anyone genuine; the API route treats a filled-in value
          as a bot and silently no-ops. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-5000px" }}>
        <input type="text" name="company" tabIndex={-1} defaultValue="" />
      </div>

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
  );
}


