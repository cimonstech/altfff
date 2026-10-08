"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import Ticker from "@/components/Ticker";
import HeroArtifacts from "@/components/HeroArtifacts";

/**
 * Compact dark hero for the News page. `id="news-hero"` and
 * `position: relative` are deliberate hooks for a later ambient artifacts
 * layer, same pattern as ContactHero/SponsorshipHero.
 */
export default function NewsHero({ latestTitles }: { latestTitles: string[] }) {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".news-hero-in", {
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
      id="news-hero"
      aria-label="News and press"
      className="relative overflow-hidden pb-0 pt-32 text-paper md:pt-40"
      style={{
        backgroundImage:
          "linear-gradient(0deg, rgba(202,144,43,0.7), rgba(202,144,43,0.7)), url('/materials/Raw-Materials/leather_hides.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <HeroArtifacts variant="dark" layout="news" density={2} />

      <div className="relative mx-auto max-w-3xl px-6 pb-14 md:px-16 md:pb-20">
        <h1 className="news-hero-in font-display text-[clamp(2.2rem,6vw,4rem)] font-extrabold uppercase leading-[1.02] tracking-tight">
          News &amp; Press
        </h1>
        <p className="news-hero-in mt-5 max-w-[60ch] text-base leading-relaxed text-paper/80 md:text-lg">
          Announcements, stories, and coverage from Africa&apos;s first
          alternative fashion fabric fair.
        </p>
      </div>

      {/* Thin ticker strip flush against the hero's bottom edge, cycling
          the three latest article titles. */}
      {latestTitles.length > 0 && <Ticker items={latestTitles} />}
    </section>
  );
}


