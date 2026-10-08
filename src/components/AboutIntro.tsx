"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const PARAGRAPHS = [
  "Alt.FFF celebrates the foundations of fashion itself, showcasing raw and semi-processed African fibres, fabrics, and textile innovations shaped by heritage, sustainability, and craftsmanship.",
  "From natural fibres and handwoven textiles to process-led material innovation, each showcase reflects the richness of Africa's diverse ecosystems, centuries-old techniques, modern technology, and forward-thinking production methods.",
  "The fair is where tradition meets innovation, unveiling the untapped potential of African materials as powerful resources for the next generation of global fashion, design, and responsible manufacturing.",
];

/** Line-by-line scrubbed-opacity reveal, adapted from Manifesto.tsx's
 * treatment for this page's remaining intro copy - same mechanic, sized
 * for body-length paragraphs rather than short manifesto lines. */
export default function AboutIntro() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const lines = gsap.utils.toArray<HTMLElement>(".about-intro-line");

      if (prefersReducedMotion()) {
        gsap.set(lines, { opacity: 1 });
        return;
      }

      lines.forEach((line) => {
        gsap.fromTo(
          line,
          { opacity: 0.25 },
          {
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: line,
              start: "top 78%",
              end: "top 50%",
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
      aria-label="About the fair, continued"
      className="relative mb-16 overflow-hidden px-6 py-20 md:mb-24 md:px-16 md:py-28"
    >
      <Image
        src="/materials/cotton-bg2.webp"
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="object-cover"
      />
      {/* Cotton is bright, near-white - the same material that needed the
          heaviest scrim anywhere on the site (Hero.tsx's own cotton
          background) for white text to hold up against it, so this one
          leans just as dark. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundColor: "color-mix(in srgb, var(--ink) 70%, transparent)" }}
      />

      <div className="relative mx-auto flex max-w-[65ch] flex-col gap-6">
        {PARAGRAPHS.map((p, i) => (
          <p
            key={i}
            className="about-intro-line text-base leading-relaxed text-paper md:text-lg"
            style={{ opacity: 0.25 }}
          >
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}


