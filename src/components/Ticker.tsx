"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { EVENT, MATERIALS } from "@/lib/constants";

const DEFAULT_ITEMS = [
  ...MATERIALS.map((m) => m.name),
  "Accra · " + EVENT.dates,
  EVENT.venue,
  "54 African Countries",
  "One space",
];

function Row({
  items,
  dense,
  variant,
}: {
  items: string[];
  dense?: boolean;
  variant: "ink" | "gold";
}) {
  const textColor = variant === "gold" ? "text-ink" : "text-paper";
  const diamondColor = variant === "gold" ? "bg-paper" : "bg-gold";
  return (
    <div className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span
            className={
              dense
                ? `px-4 font-display text-sm font-semibold uppercase tracking-wide ${textColor}`
                : `px-6 font-display text-lg font-semibold uppercase tracking-wide md:text-xl ${textColor}`
            }
          >
            {item}
          </span>
          <span
            aria-hidden
            className={`inline-block rotate-45 ${diamondColor} ${dense ? "h-1.5 w-1.5" : "h-2 w-2"}`}
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
 * touch - used on mobile, where the default thickness/speed reads heavy on
 * a small viewport pinned right against a hero image. */
export default function Ticker({
  items = DEFAULT_ITEMS,
  className = "",
  dense = false,
  variant = "ink",
}: {
  items?: string[];
  className?: string;
  dense?: boolean;
  /** "gold" swaps the ink background for a gold one with paper (white)
   * diamonds instead of gold ones - used where the ticker sits on its own
   * as a decorative accent rather than the default dark marquee strip. */
  variant?: "ink" | "gold";
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
      className={`overflow-hidden ${variant === "gold" ? "bg-gold" : "bg-ink"} ${dense ? "py-2" : "py-4"} ${className}`}
    >
      <div ref={trackRef} className="flex w-max">
        <Row items={items} dense={dense} variant={variant} />
        <Row items={items} dense={dense} variant={variant} />
      </div>
    </div>
  );
}


