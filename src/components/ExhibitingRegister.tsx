"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { useSiteModals } from "@/components/SiteModals";

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

export default function ExhibitingRegister() {
  const container = useRef<HTMLElement>(null);
  const { openExhibitModal } = useSiteModals();

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
      // Each reason bullet animates in as the user scrolls to it, distinct
      // from the block-level reveal above.
      gsap.from(".register-reason-marker", {
        scale: 0,
        duration: 0.5,
        ease: "back.out(2)",
        stagger: 0.08,
        scrollTrigger: { trigger: ".register-reasons-list", start: "top 78%", once: true },
      });
      gsap.from(".register-reason-text", {
        x: -10,
        autoAlpha: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.08,
        scrollTrigger: { trigger: ".register-reasons-list", start: "top 78%", once: true },
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
      <div className="mx-auto max-w-3xl">
        <h2 className="register-in font-display text-[clamp(1.8rem,4vw,3rem)] font-extrabold uppercase tracking-tight text-ink">
          Register to Exhibit at Alt.FFF
        </h2>
        <p className="register-in mt-4 max-w-[50ch] text-sm leading-relaxed text-indigo md:text-base">
          If you&apos;re interested in exhibiting with us, complete the form
          with a few details about your business. We&apos;ll review your
          information and get back to you.
        </p>

        <ul className="register-in register-reasons-list mt-8 flex flex-col gap-3">
          {REASON_HEADINGS.map((h) => (
            <li key={h} className="flex items-start gap-2.5 text-sm text-ink">
              <span
                aria-hidden
                className="register-reason-marker mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
              />
              <span className="register-reason-text">{h}</span>
            </li>
          ))}
        </ul>

        {/* Deliberately NOT part of the .register-in scroll-triggered
            reveal above: a primary CTA should never be gated behind
            scroll-animation reliability - if a ScrollTrigger ever fails
            to fire for any reason, this must still be visible and
            clickable, not stuck at its pre-reveal hidden state. */}
        <button
          type="button"
          onClick={openExhibitModal}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
        >
          Apply to exhibit
        </button>
      </div>
    </section>
  );
}


