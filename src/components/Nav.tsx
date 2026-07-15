"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const LEFT_LINKS = [
  { label: "About", href: "#about" },
  { label: "Materials", href: "#materials" },
  { label: "Exhibiting", href: "#visit" },
];

const RIGHT_LINKS = [
  { label: "Visit", href: "#visit" },
  { label: "Sponsorship", href: "#sponsorship" },
  { label: "Contact", href: "#contact" },
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

  // Hide while actively scrolling (any direction), leaving a 2px lip;
  // slide back ~400ms after scrolling stops. Activity-based, not
  // direction-based, so this is a plain scroll listener + debounce timer.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || prefersReducedMotion()) return;

    let hidden = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      if (window.scrollY > 80 && !hidden) {
        hidden = true;
        gsap.to(bar, {
          y: -(bar.offsetHeight - 2),
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

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
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
              {LEFT_LINKS.map((l) => (
                <a key={l.label} href={l.href} className={linkClass}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          <a
            href="#top"
            className="font-display text-xl font-extrabold tracking-tight text-ink"
          >
            Alt.FFF
          </a>

          <div className="hidden items-center justify-end gap-6 md:flex">
            {RIGHT_LINKS.map((l) => (
              <a key={l.label} href={l.href} className={linkClass}>
                {l.label}
              </a>
            ))}
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
