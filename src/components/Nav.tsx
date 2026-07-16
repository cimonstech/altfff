"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { getLenis } from "@/lib/scroll";

// `page: true` entries are real, standalone routes (rendered as next/link
// for client-side navigation). The rest are sections that only exist on
// the homepage — those get a "/#id" href (not bare "#id") specifically so
// they still work correctly when clicked from another page: a bare hash
// only ever touches the current page's URL, so from e.g. /about it just
// silently rewrote the address bar without navigating anywhere. "/#id"
// navigates home first, then the browser (or Lenis, via SmoothScroll's
// `anchors: true`) scrolls to the section on arrival.
const LEFT_LINKS = [
  { label: "About", href: "/about", page: true },
  { label: "Materials", href: "/#materials", page: false },
  { label: "Exhibiting", href: "/exhibiting", page: true },
];

const RIGHT_LINKS = [
  { label: "Visit", href: "/#visit", page: false },
  { label: "Sponsorship", href: "/#sponsorship", page: false },
  { label: "Contact", href: "/contact", page: true },
];

const CHAMFER = 22;
const CORNER = 9;

/**
 * Bar shape: straight top, bottom-left/right corners chamfered at 45° with
 * the chamfer points themselves rounded (quadratic curves). Used both as a
 * clip-path on the blurred bar and as a stroked SVG for the hairline edge.
 */
function barPath(w: number, h: number, c = CHAMFER, r = CORNER) {
  const k = r * Math.SQRT1_2;
  return [
    `M 0 0`,
    `L ${w} 0`,
    `L ${w} ${h - c - r}`,
    `Q ${w} ${h - c} ${w - k} ${h - c + k}`,
    `L ${w - c + k} ${h - k}`,
    `Q ${w - c} ${h} ${w - c - r} ${h}`,
    `L ${c + r} ${h}`,
    `Q ${c} ${h} ${c - k} ${h - k}`,
    `L ${k} ${h - c + k}`,
    `Q 0 ${h - c} 0 ${h - c - r}`,
    `Z`,
  ].join(" ");
}

export default function Nav() {
  const barRef = useRef<HTMLElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // Measure the bar so the clip-path / border SVG track its real size.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () =>
      setDims({ w: bar.offsetWidth, h: bar.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  // Hide while actively scrolling (any direction), leaving a 3px lip;
  // slide back ~400ms after scrolling stops. Activity-based, not
  // direction-based, so this is a scroll listener + debounce timer.
  //
  // This listens to Lenis's own "scroll" event, not the native window
  // scroll event: Lenis drives scrolling itself (via rAF-smoothed native
  // scrollTo calls), and the browser coalesces/suppresses most of the
  // native scroll events that would otherwise fire during that animated
  // scroll — in practice as few as one native event for an entire
  // multi-hundred-ms scroll gesture, which starves this debounce logic of
  // the continuous signal it needs to know scrolling is still happening.
  // Lenis's own event fires every animation frame instead (the same event
  // this app already uses to drive ScrollTrigger.update in
  // SmoothScroll.tsx), so it's the reliable source here.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || prefersReducedMotion()) return;

    const HIDDEN_LIP = 3; // px of the bar left visible when hidden

    let hidden = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    let waitId: number | undefined;
    let cancelled = false;

    const onScroll = (lenis: { animatedScroll: number }) => {
      if (lenis.animatedScroll > 80 && !hidden) {
        hidden = true;
        gsap.to(bar, {
          y: -(bar.offsetHeight - HIDDEN_LIP),
          duration: 0.35,
          ease: "power3.out",
          overwrite: "auto",
        });
      }
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        hidden = false;
        gsap.to(bar, { y: 0, duration: 0.55, ease: "power3.out", overwrite: "auto" });
      }, 400);
    };

    // SmoothScroll.tsx creates the Lenis instance in an effect of its own,
    // and effects fire child-first — this component's effect can run
    // before that one has, so the instance isn't guaranteed to exist yet.
    // Poll a frame at a time (bounded by `cancelled` on unmount) until it
    // does; SmoothScroll's effect will always have run by the next frame.
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
      gsap.killTweensOf(bar);
    };
  }, []);

  const path = dims ? barPath(dims.w, dims.h) : null;

  const linkClass =
    "text-[11px] font-medium uppercase tracking-[0.18em] text-ink transition-opacity hover:opacity-60";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <header
        ref={barRef}
        className="pointer-events-auto relative w-full max-w-[920px]"
        style={{
          backgroundColor: "#FFFFFF",
          clipPath: path ? `path("${path}")` : undefined,
          // The bottom edge doubles as the 3px "lip" left on screen when
          // the bar is hidden (see the scroll effect above) — a plain
          // hairline for now, no color treatment yet.
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        <nav
          aria-label="Main"
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-8 pb-4 pt-3 md:px-10"
        >
          <div className="flex items-center gap-6">
            <button
              type="button"
              aria-label="Open menu"
              className="flex h-8 w-8 flex-col items-center justify-center gap-[5px] md:hidden"
            >
              <span className="h-[2px] w-5 bg-ink" />
              <span className="h-[2px] w-5 bg-ink" />
            </button>
            <div className="hidden items-center gap-6 md:flex">
              {LEFT_LINKS.map((l) =>
                l.page ? (
                  <Link key={l.label} href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                ) : (
                  <a key={l.label} href={l.href} className={linkClass}>
                    {l.label}
                  </a>
                ),
              )}
            </div>
          </div>

          <Link
            href="/"
            className="font-display text-xl font-extrabold tracking-tight text-ink"
          >
            Alt.FFF
          </Link>

          <div className="hidden items-center justify-end gap-6 md:flex">
            {RIGHT_LINKS.map((l) =>
              l.page ? (
                <Link key={l.label} href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              ) : (
                <a key={l.label} href={l.href} className={linkClass}>
                  {l.label}
                </a>
              ),
            )}
          </div>
        </nav>

        {dims && (
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0"
            width={dims.w}
            height={dims.h}
            viewBox={`0 0 ${dims.w} ${dims.h}`}
            fill="none"
          >
            <path d={barPath(dims.w, dims.h)} stroke="var(--hairline)" strokeWidth="1.5" />
          </svg>
        )}
      </header>
    </div>
  );
}
