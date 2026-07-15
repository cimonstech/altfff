"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const LINES = [
  "Before fashion, there are materials.",
  "Alt.FFF brings the makers, dyers, weavers and tanners of a continent onto one floor,",
  "so the industry can see where fashion really begins.",
];

export default function Manifesto() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const lines = gsap.utils.toArray<HTMLElement>(".manifesto-line");

      if (prefersReducedMotion()) {
        gsap.set(lines, { opacity: 1 });
        return;
      }

      // Each line fades 15% → 100% as it crosses the viewport centre.
      lines.forEach((line) => {
        gsap.fromTo(
          line,
          { opacity: 0.15 },
          {
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: line,
              start: "top 72%",
              end: "top 45%",
              scrub: true,
            },
          },
        );
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="about"
      aria-label="Manifesto"
      className="bg-paper px-6 py-28 md:px-16 md:py-40"
    >
      <p className="mx-auto max-w-4xl font-display text-[clamp(1.6rem,3.6vw,2.9rem)] font-semibold leading-[1.15] text-ink">
        {LINES.map((line, i) => (
          <span key={i} className="manifesto-line block" style={{ opacity: 0.15 }}>
            {line}
          </span>
        ))}
      </p>
    </section>
  );
}
