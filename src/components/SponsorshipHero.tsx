"use client";

import Image from "next/image";
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
  const spoolRef = useRef<HTMLDivElement>(null);

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

      {/* Kente spool, left side, bigger than the cowrie HeroArtifacts
          already places on the right. */}
      <div
        ref={spoolRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-[5%] top-[18%] hidden h-14 w-14 md:block"
      >
        <Image
          src="/materials/kente-spool.png"
          alt=""
          fill
          sizes="56px"
          className="object-contain drop-shadow-[0_8px_12px_rgba(23,28,38,0.28)]"
        />
      </div>

      {/* Fabric swatch strip, flush along the hero's bottom edge - a single
          next/image `fill` layer (not a CSS background-image, so there's no
          background-repeat involved), clipped by this div's own
          overflow-hidden so it crops to a band rather than distorting to
          fit. z-index is left at auto on every layer in this hero, so DOM
          order alone determines stacking - this div comes before the
          content wrapper below, so the headline/CTA always paint on top. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[120px] overflow-hidden md:h-[160px]"
      >
        <Image
          src="/materials/fabrics.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-top"
        />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <h1 className="sponsor-hero-in font-display text-[clamp(2.4rem,6.5vw,5rem)] font-extrabold uppercase leading-[1.02] tracking-tight">
          Support the Future of African Materials
        </h1>
        <p className="sponsor-hero-in mt-6 max-w-[60ch] text-base leading-relaxed text-paper/80 md:text-lg">
          Alt.FFF is a catalyst, not just an event. Sponsorship puts your
          brand behind the platform bridging African creativity with global
          commerce. {EVENT.tradeFairDateLabel}.
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


