"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { EVENT } from "@/lib/constants";
import { scrollToSection } from "@/lib/scroll";
import HeroArtifacts from "@/components/HeroArtifacts";

export default function VisitHero() {
  const container = useRef<HTMLElement>(null);
  const spoolRef = useRef<HTMLDivElement>(null);
  const raffiaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      if (spoolRef.current) {
        gsap.to(spoolRef.current, {
          y: -14,
          rotation: 7,
          duration: 2.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }
      if (raffiaRef.current) {
        gsap.to(raffiaRef.current, {
          y: -10,
          rotation: -10,
          duration: 1.7,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="visit-hero"
      aria-label="Plan your visit"
      className="relative overflow-hidden bg-paper px-6 pb-16 pt-32 md:px-16 md:pb-20 md:pt-40"
    >
      <HeroArtifacts variant="light" layout="visit" density={2} />

      {/* Kente spool and raffia - bigger/smaller decorative pair alongside
          HeroArtifacts' cowrie/cotton. Spool sits on the left, clear of the
          centered max-w-3xl text column; raffia stays on the right. */}
      <div
        ref={spoolRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-[5%] top-[20%] hidden h-14 w-14 md:block"
      >
        <Image
          src="/materials/kente-spool.png"
          alt=""
          fill
          sizes="56px"
          className="object-contain drop-shadow-[0_8px_12px_rgba(23,28,38,0.28)]"
        />
      </div>
      <div
        ref={raffiaRef}
        aria-hidden="true"
        className="pointer-events-none absolute right-[16%] top-[62%] hidden h-10 w-10 md:block"
      >
        <Image
          src="/materials/raffia.png"
          alt=""
          fill
          sizes="40px"
          className="object-contain drop-shadow-[0_8px_12px_rgba(23,28,38,0.28)]"
        />
      </div>

      <div className="relative mx-auto max-w-3xl">
        <h1 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold uppercase leading-[1.02] tracking-tight text-ink">
          Plan Your Visit
        </h1>
        <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-indigo md:text-lg">
          Join us on {EVENT.tradeFairDateLabel} at {EVENT.venue} - a one-day
          trade fair of fibres, dyes, weaves, and the people behind them.
        </p>
        <p className="mt-3 max-w-[55ch] text-sm leading-relaxed text-indigo/80 md:text-base">
          {EVENT.launchCeremonyLabel}. {EVENT.doorsOpenLabel}.
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


