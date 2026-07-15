"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

export default function Quote() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".quote-inner", {
        y: 36,
        autoAlpha: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: container.current,
          start: "top 75%",
          once: true,
        },
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      aria-label="Quote"
      className="bg-paper px-6 py-24 md:px-16 md:py-32"
    >
      <figure className="quote-inner relative mx-auto max-w-3xl">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-4 -top-16 font-display text-[10rem] font-extrabold leading-none text-madder md:-left-16"
        >
          &ldquo;
        </span>
        <blockquote className="relative font-display text-[clamp(1.5rem,3.2vw,2.4rem)] font-semibold leading-snug text-ink">
          Placeholder pull quote about what it means to source directly from
          the continent&apos;s makers. A real voice from the fair goes here.
        </blockquote>
        <figcaption className="mt-6 text-sm uppercase tracking-[0.18em] text-indigo">
          Name Placeholder, Title, Organisation
        </figcaption>
      </figure>
    </section>
  );
}
