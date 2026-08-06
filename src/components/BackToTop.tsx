"use client";

import { useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { getLenis, scrollToTop } from "@/lib/scroll";

const SHOW_AFTER = 400; // px scrolled before the button becomes eligible to show
const IDLE_DELAY = 400; // ms of no scroll activity before it reappears

/**
 * Floating "back to top" button. Visible at rest once the page is scrolled
 * past SHOW_AFTER; vanishes the instant scrolling resumes and reappears
 * IDLE_DELAY after it stops - same activity-based show/hide mechanic as
 * Nav's hide-on-scroll bar (Lenis's own "scroll" event, not the native
 * window one, for the same reason documented there: Lenis coalesces native
 * scroll events during its animated scroll, so its own per-frame event is
 * the only reliable continuous signal).
 */
export default function BackToTop() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const visibleRef = useRef(false);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const reduced = prefersReducedMotion();

    const setVisible = (visible: boolean) => {
      if (visible === visibleRef.current) return;
      visibleRef.current = visible;
      if (reduced) {
        gsap.set(button, { autoAlpha: visible ? 1 : 0 });
        return;
      }
      gsap.to(button, {
        autoAlpha: visible ? 1 : 0,
        duration: visible ? 0.4 : 0.25,
        ease: visible ? "power3.out" : "power2.in",
        overwrite: "auto",
      });
    };

    gsap.set(button, { autoAlpha: 0 });

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let waitId: number | undefined;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const onScroll = (lenis: { animatedScroll: number }) => {
      const past = lenis.animatedScroll > SHOW_AFTER;
      clearTimeout(idleTimer);
      if (!past) {
        setVisible(false);
        return;
      }
      setVisible(false);
      idleTimer = setTimeout(() => setVisible(true), IDLE_DELAY);
    };

    const waitForLenis = () => {
      if (cancelled) return;
      const lenis = getLenis();
      if (lenis) {
        unsubscribe = lenis.on("scroll", onScroll);
      } else {
        waitId = requestAnimationFrame(waitForLenis);
      }
    };
    waitForLenis();

    return () => {
      cancelled = true;
      if (waitId !== undefined) cancelAnimationFrame(waitId);
      unsubscribe?.();
      clearTimeout(idleTimer);
      gsap.killTweensOf(button);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Back to top"
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper shadow-[0_8px_24px_rgba(23,28,38,0.28)] transition-opacity hover:opacity-85"
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <ArrowUp size={18} aria-hidden="true" />
    </button>
  );
}
