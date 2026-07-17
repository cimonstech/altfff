"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import HeroArtifacts from "@/components/HeroArtifacts";

/**
 * Compact dark hero for the Contact page. `id="contact-hero"` and
 * `position: relative` are deliberate hooks — a separate, later piece of
 * work adds an ambient artifacts layer here, and needs a stable
 * positioned parent to mount into (same pattern as SponsorshipHero).
 */
export default function ContactHero() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".contact-hero-in", {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.1,
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="contact-hero"
      aria-label="Get in touch"
      className="relative overflow-hidden bg-indigo px-6 pb-16 pt-32 text-paper md:px-16 md:pb-20 md:pt-40"
    >
      <HeroArtifacts variant="dark" layout="contact" density={2} />

      <div className="relative mx-auto max-w-3xl">
        <h1 className="contact-hero-in font-display text-[clamp(2.2rem,6vw,4rem)] font-extrabold uppercase leading-[1.02] tracking-tight">
          Get in Touch
        </h1>
        <p className="contact-hero-in mt-5 max-w-[60ch] text-base leading-relaxed text-paper/80 md:text-lg">
          Whether you&apos;re interested in exhibiting, sponsoring,
          partnering, or simply learning more about Alt.FFF, our team is
          here to help.
        </p>
        <p className="contact-hero-in mt-3 max-w-[60ch] text-base leading-relaxed text-paper/80 md:text-lg">
          If you have any other questions, get in touch and we&apos;ll be
          happy to assist you.
        </p>
      </div>
    </section>
  );
}
