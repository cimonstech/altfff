"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { scrollToSection } from "@/lib/scroll";
import { EVENT } from "@/lib/constants";
import HeroArtifacts from "@/components/HeroArtifacts";

/**
 * Dark hero for the Sponsorship page. `id="sponsorship-hero"` and
 * `position: relative` are deliberate hooks - a separate, later piece of
 * work adds an ambient cowrie/cotton artifacts layer here, and needs a
 * stable positioned parent to mount into.
 */
export default function SponsorshipHero() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".sponsor-hero-in", {
        y: 26,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.1,
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="sponsorship-hero"
      aria-label="Sponsorship"
      className="relative overflow-hidden bg-indigo px-6 pb-20 pt-32 text-paper md:px-16 md:pb-28 md:pt-40"
    >
      <HeroArtifacts variant="dark" layout="sponsorship" density={2} />

      <div className="relative mx-auto max-w-4xl">
        <h1 className="sponsor-hero-in font-display text-[clamp(2.4rem,6.5vw,5rem)] font-extrabold uppercase leading-[1.02] tracking-tight">
          Back the Future of African Materials
        </h1>
        <p className="sponsor-hero-in mt-6 max-w-[60ch] text-base leading-relaxed text-paper/80 md:text-lg">
          Alt.FFF is a catalyst, not just an event. Sponsorship puts your
          brand behind the platform bridging African creativity with global
          commerce. {EVENT.dates}, {EVENT.city}.
        </p>
        <button
          type="button"
          onClick={() => scrollToSection("#sponsor-form")}
          className="sponsor-hero-in mt-8 inline-flex items-center gap-2 rounded-full border border-gold bg-gold px-7 py-3.5 text-sm font-semibold text-paper transition-colors hover:border-gold-deep hover:bg-gold-deep"
        >
          Become a Sponsor
        </button>
      </div>
    </section>
  );
}


