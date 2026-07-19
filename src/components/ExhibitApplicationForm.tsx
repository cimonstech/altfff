"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { FloatingField, FloatingSelect } from "@/components/FormFields";

const TOTAL_FIELDS = 9; // 8 text/tel/email inputs + 1 select

type Status = "idle" | "submitting" | "success" | "error";

/**
 * The exhibitor application form - rendered as the shared Modal's content
 * when opened from any "Apply to exhibit" CTA site-wide. Submits to
 * /api/exhibitor-applications, matching the pattern already proven in
 * ContactForm.tsx.
 */
export default function ExhibitApplicationForm({ headingId }: { headingId?: string }) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const filledSetRef = useRef<Set<string>>(new Set());
  const [filledCount, setFilledCount] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFilledChange = useCallback((id: string, filled: boolean) => {
    const set = filledSetRef.current;
    if (filled) set.add(id);
    else set.delete(id);
    setFilledCount(set.size);
  }, []);

  useEffect(() => {
    const pct = (filledCount / TOTAL_FIELDS) * 100;
    gsap.to(progressBarRef.current, {
      width: `${pct}%`,
      duration: 0.4,
      ease: "power2.out",
    });
  }, [filledCount]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/exhibitor-applications", {
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
          Application received.
        </p>
        <p className="mt-2 text-sm text-indigo">
          Thank you for applying to exhibit - our team will review your application and be in touch.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <h2 id={headingId} className="pr-8 font-display text-lg font-extrabold uppercase tracking-tight text-ink">
        Do you produce in Africa? We want to hear from you!
      </h2>

      {/* Live progress indicator - interface polish only, no validation
          logic tied to it. */}
      <div className="mb-1 mt-4 flex items-center gap-3">
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-hairline">
          <div ref={progressBarRef} className="h-full w-0 rounded-full bg-gold" />
        </div>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink/50">
          {filledCount} of {TOTAL_FIELDS} complete
        </span>
      </div>

      <form className="flex flex-col gap-1" onSubmit={handleSubmit}>
        <FloatingField id="email" label="Email Address" required type="email" onFilledChange={handleFilledChange} />
        <FloatingField id="name" label="Full Name" onFilledChange={handleFilledChange} />
        <FloatingField id="phone" label="Phone Number" type="tel" onFilledChange={handleFilledChange} />
        <FloatingField id="company" label="Company Name" onFilledChange={handleFilledChange} />
        <FloatingField id="title" label="Job Title" onFilledChange={handleFilledChange} />
        <FloatingField id="nature" label="What is the nature of your business" onFilledChange={handleFilledChange} />
        <FloatingField id="based" label="Where is your business based" onFilledChange={handleFilledChange} />

        <FloatingSelect
          id="space"
          label="We would like a space"
          onFilledChange={handleFilledChange}
          options={[
            { value: "standard", text: "Standard Booth (3m x 3m) - GHS 8,400" },
            { value: "medium", text: "Medium Booth (3m x 4m) - GHS 11,500" },
            { value: "premium", text: "Premium Booth (3m x 6m) - GHS 16,500" },
            {
              value: "innovation",
              text: "Innovation Start-up Pod (shared pod) - GHS 3,000 per company",
            },
          ]}
        />

        <FloatingField id="hear" label="Where did you hear about Alt.FFF?" onFilledChange={handleFilledChange} />

        {/* Honeypot - hidden from real users via CSS (never display:none/
            hidden, some bots skip those specifically), matching
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
          {status === "submitting" ? "Sending…" : "Submit"}
        </button>
      </form>

      {/* Condensed, plain-language terms summary - verbatim facts only.
          This is a page summary, not a Terms of Service page: that's a
          separate, still-pending task requiring proper legal review. */}
      <details className="mt-8 rounded-xl border border-hairline bg-paper p-5">
        <summary className="cursor-pointer font-display text-sm font-bold uppercase tracking-tight text-ink">
          Key Terms Summary
        </summary>
        <div className="mt-4 flex flex-col gap-2.5 text-sm leading-relaxed text-ink/80">
          <p>All payments are made via bank transfer. Bank charges and transfer fees are covered by the payer.</p>
          <p>
            Deposits are non-refundable. Cancellations after full payment received after February
            28, 2026 are non-refundable.
          </p>
          <p>
            Participation may be transferred to another party with prior written approval from
            Fashion Forum Africa.
          </p>
          <p>
            A late payment fee of 0.15% per calendar day applies to any overdue balance, capped at
            10% of the outstanding amount.
          </p>
          <a
            href="/Exhibitors+Pack+ALT.FFF_June+2026.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-gold-deep underline underline-offset-2 hover:opacity-80"
          >
            Read the full exhibitor terms and conditions
          </a>
        </div>
      </details>
    </div>
  );
}
