"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [loopItems, setLoopItems] = useState(items);

  // Reset and re-expand when the source list or density changes.
  useLayoutEffect(() => {
    setLoopItems(items);
  }, [items, dense]);

  // Repeat the item list until one segment spans at least the viewport
  // width, so wide screens never show empty space between loop cycles.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track || track.children.length === 0) return;

    const segment = track.children[0] as HTMLElement;
    if (segment.offsetWidth >= container.clientWidth) return;
    if (loopItems.length >= items.length * 40) return;

    setLoopItems((prev) => [...prev, ...items]);
  }, [loopItems, items, dense]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resetLoop = () => setLoopItems(items);
    const ro = new ResizeObserver(resetLoop);
    ro.observe(container);
    return () => ro.disconnect();
  }, [items]);

  useGSAP(
    () => {
      const track = trackRef.current;
      if (prefersReducedMotion() || !track || track.children.length === 0) return;

      const segment = track.children[0] as HTMLElement;
      const segmentWidth = segment.offsetWidth;
      if (!segmentWidth) return;

      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const baseDuration = isMobile ? 42 : 32;
      const duration = baseDuration * (loopItems.length / DEFAULT_ITEMS.length);

      const tween = gsap.to(track, {
        x: -segmentWidth,
        duration,
        ease: "none",
        repeat: -1,
      });

      return () => {
        tween.kill();
      };
    },
    { scope: containerRef, dependencies: [loopItems, dense] },
  );

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`overflow-hidden ${variant === "gold" ? "bg-gold" : "bg-ink"} ${dense ? "py-2" : "py-4"} ${className}`}
    >
      <div ref={trackRef} className="flex w-max will-change-transform">
        <Row items={loopItems} dense={dense} variant={variant} />
        <Row items={loopItems} dense={dense} variant={variant} />
      </div>
    </div>
  );
}
