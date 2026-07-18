"use client";

import { EVENT } from "@/lib/constants";
import { scrollToSection } from "@/lib/scroll";
import HeroArtifacts from "@/components/HeroArtifacts";

export default function VisitHero() {
  return (
    <section
      id="visit-hero"
      aria-label="Plan your visit"
      className="relative overflow-hidden bg-paper px-6 pb-16 pt-32 md:px-16 md:pb-20 md:pt-40"
    >
      <HeroArtifacts variant="light" layout="visit" density={2} />

      <div className="relative mx-auto max-w-3xl">
        <h1 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold uppercase leading-[1.02] tracking-tight text-ink">
          Plan Your Visit
        </h1>
        <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-indigo md:text-lg">
          Join us for {EVENT.dates} at {EVENT.venue}, {EVENT.city} - three
          days of fibres, dyes, weaves, and the people behind them.
        </p>
        <button
          type="button"
          onClick={() => scrollToSection("#visit-register")}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-ink transition-opacity hover:opacity-85"
        >
          Register to visit
        </button>
      </div>
    </section>
  );
}


