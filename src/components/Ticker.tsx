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

function Row({ items }: { items: string[] }) {
  return (
    <div className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="px-6 font-display text-lg font-semibold uppercase tracking-wide text-paper md:text-xl">
            {item}
          </span>
          <span
            aria-hidden
            className="inline-block h-2 w-2 rotate-45"
            style={{ backgroundColor: "#F4821F" }}
          />
        </span>
      ))}
    </div>
  );
}

/** Infinite one-direction marquee. `items` defaults to the homepage's own
 * materials/event mix; pass a custom list to reuse the same ink/paper/gold
 * treatment elsewhere with different content (e.g. the Exhibiting page). */
export default function Ticker({
  items = DEFAULT_ITEMS,
  className = "",
}: {
  items?: string[];
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !trackRef.current) return;
      gsap.to(trackRef.current, {
        xPercent: -50,
        duration: 32,
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
      className={`overflow-hidden bg-ink py-4 ${className}`}
    >
      <div ref={trackRef} className="flex w-max">
        <Row items={items} />
        <Row items={items} />
      </div>
    </div>
  );
}
