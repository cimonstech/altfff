"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { EVENT, MATERIALS } from "@/lib/constants";

const DEFAULT_ITEMS = [
  ...MATERIALS.map((m) => m.name),
  "Accra · Sept 17–19, 2026",
  EVENT.venue,
  "54 countries",
  "One floor",
];

function Row({ items, dense }: { items: string[]; dense?: boolean }) {
  return (
    <div className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span
            className={
              dense
                ? "px-4 font-display text-sm font-semibold uppercase tracking-wide text-paper"
                : "px-6 font-display text-lg font-semibold uppercase tracking-wide text-paper md:text-xl"
            }
          >
            {item}
          </span>
          <span
            aria-hidden
            className={`inline-block rotate-45 bg-gold ${dense ? "h-1.5 w-1.5" : "h-2 w-2"}`}
          />
        </span>
      ))}
    </div>
  );
}

/** Infinite one-direction marquee. `items` defaults to the homepage's own
 * materials/event mix; pass a custom list to reuse the same ink/paper/gold
 * treatment elsewhere with different content (e.g. the Exhibiting page).
 * `dense` shrinks the strip (padding + type size) and slows the scroll a
 * touch — used on mobile, where the default thickness/speed reads heavy on
 * a small viewport pinned right against a hero image. */
export default function Ticker({
  items = DEFAULT_ITEMS,
  className = "",
  dense = false,
}: {
  items?: string[];
  className?: string;
  dense?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !trackRef.current) return;
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      gsap.to(trackRef.current, {
        xPercent: -50,
        duration: isMobile ? 42 : 32,
        ease: "none",
        repeat: -1,
      });
    },
    { scope: container },
  );

  return (
    <div
      ref={container}
      aria-hidden
      className={`overflow-hidden bg-ink ${dense ? "py-2" : "py-4"} ${className}`}
    >
      <div ref={trackRef} className="flex w-max">
        <Row items={items} dense={dense} />
        <Row items={items} dense={dense} />
      </div>
    </div>
  );
}
