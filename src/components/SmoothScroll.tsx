"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { setLenis } from "@/lib/scroll";

/**
 * Creates the Lenis instance, drives it from the GSAP ticker and keeps
 * ScrollTrigger in sync. Disabled entirely under prefers-reduced-motion.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    // `anchors` lets in-page hash links (nav, CTAs) scroll smoothly
    // through Lenis instead of jumping.
    const lenis = new Lenis({ anchors: true });
    setLenis(lenis);

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  // ScrollTrigger caches each trigger's pixel position at creation time.
  // Web fonts swapping in (font-display: swap) after that initial
  // calculation can reflow text and shift everything below it, leaving a
  // trigger stale. A single refresh once fonts have actually loaded
  // corrects that — deliberately one-shot rather than a continuous
  // ResizeObserver: refreshing while a stagger reveal is mid-flight can
  // reset its progress and strand later-staggered elements never
  // finishing, which is worse than the staleness it'd be fixing.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  return <>{children}</>;
}
