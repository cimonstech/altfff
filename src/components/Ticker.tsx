"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { EVENT, MATERIALS } from "@/lib/constants";

const ITEMS = [
  ...MATERIALS.map((m) => m.name),
  "Accra · Sept 17–19, 2026",
  EVENT.venue,
  "54 countries",
  "One floor",
];

function Row() {
  return (
    <div className="flex shrink-0 items-center">
      {ITEMS.map((item, i) => (
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

export default function Ticker() {
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
      className="overflow-hidden bg-ink py-4"
    >
      <div ref={trackRef} className="flex w-max">
        <Row />
        <Row />
      </div>
    </div>
  );
}
