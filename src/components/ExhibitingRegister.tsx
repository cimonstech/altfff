"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const REASON_HEADINGS = [
  "Showcase Your Brand to the Right Audience",
  "Build Valuable Connections",
  "Generate New Business Opportunities",
  "Position Yourself as an Industry Leader",
  "Launch New Products or Services",
  "Gain Media & Brand Exposure",
  "Be Part of a Movement",
  "Why It Matters",
];

/** Plain labelled text input, sharing one style across the form below. */
function Field({
  label,
  required,
  type = "text",
}: {
  label: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink/70">
      <span>
        {label}
        {required && <span className="text-madder"> *</span>}
      </span>
      <input
        type={type}
        required={required}
        className="rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm normal-case tracking-normal text-ink placeholder:text-ink/30"
      />
    </label>
  );
}

export default function ExhibitingRegister() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".register-in", {
        y: 28,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.06,
        scrollTrigger: { trigger: container.current, start: "top 75%", once: true },
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="register"
      aria-label="Register to exhibit"
      className="bg-paper px-6 py-20 md:px-16 md:py-28"
    >
      <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-2">
        {/* Left: heading, sub-copy, condensed reasons list */}
        <div>
          <h2 className="register-in font-display text-[clamp(1.8rem,4vw,3rem)] font-extrabold uppercase tracking-tight text-ink">
            Register to Exhibit at Alt.FFF
          </h2>
          <p className="register-in mt-4 max-w-[50ch] text-sm leading-relaxed text-indigo md:text-base">
            If you&apos;re interested in exhibiting with us, complete the form
            with a few details about your business. We&apos;ll review your
            information and get back to you.
          </p>

          <ul className="register-in mt-8 flex flex-col gap-3">
            {REASON_HEADINGS.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm text-ink">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: visual-only form scaffold.
            NOTE: no submission wiring yet. Needs a decision on Mailchimp
            vs. a custom backend integration before this can actually
            collect and store submissions — flagging here rather than
            faking a working form. */}
        <form
          className="register-in flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-6 md:p-8"
          onSubmit={(e) => e.preventDefault()}
        >
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
            Do you produce in Africa? We want to hear from you!
          </h3>

          <Field label="Email Address" required type="email" />
          <Field label="Full Name" />
          <Field label="Phone Number" type="tel" />
          <Field label="Company Name" />
          <Field label="Job Title" />
          <Field label="What is the nature of your business" />
          <Field label="Where is your business based" />

          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink/70">
            We would like a space
            <select
              className="rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm normal-case tracking-normal text-ink"
              defaultValue=""
            >
              <option value="" disabled>
                Select an option
              </option>
              {/* Placeholder tier names, pending real package names. */}
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="flagship">Flagship</option>
            </select>
          </label>

          <Field label="Where did you hear about Alt.FFF?" />

          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-ink/80">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline" />
            Tick the box if you would like to receive email updates regarding
            the Alt.FFF event.
          </label>

          <button
            type="submit"
            className="mt-2 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
          >
            Subscribe
          </button>

          <p className="mt-1 text-center text-[10px] uppercase tracking-wider text-ink/50">
            Powered by Mailchimp
          </p>
        </form>
      </div>
    </section>
  );
}
