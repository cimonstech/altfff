"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const DEFAULT_QUOTE =
  "Placeholder pull quote about what it means to source directly from the continent's makers. A real voice from the fair goes here.";
const DEFAULT_ATTRIBUTION = "Name Placeholder, Title, Organisation";

/** Full-width pull quote, giant madder quotation mark, fade-up reveal.
 * `dark` swaps the homepage's paper/ink treatment for ink/paper (used by
 * the Exhibiting page); `image` adds an optional side photo. */
export default function Quote({
  quote = DEFAULT_QUOTE,
  attribution = DEFAULT_ATTRIBUTION,
  dark = false,
  image,
}: {
  quote?: string;
  attribution?: string;
  dark?: boolean;
  image?: { src: string; alt: string };
}) {
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
      className={`px-6 py-24 md:px-16 md:py-32 ${dark ? "bg-ink" : "bg-paper"}`}
    >
      <div
        className={`quote-inner mx-auto flex max-w-5xl flex-col gap-10 ${
          image ? "md:grid md:grid-cols-12 md:items-center md:gap-12" : ""
        }`}
      >
        <figure className={`relative ${image ? "md:col-span-7" : "max-w-3xl"}`}>
          <span
            aria-hidden
            className="pointer-events-none absolute -left-4 -top-16 font-display text-[10rem] font-extrabold leading-none text-madder md:-left-16"
          >
            &ldquo;
          </span>
          <blockquote
            className={`relative font-display text-[clamp(1.5rem,3.2vw,2.4rem)] font-semibold leading-snug ${
              dark ? "text-paper" : "text-ink"
            }`}
          >
            {quote}
          </blockquote>
          <figcaption
            className={`mt-6 text-sm uppercase tracking-[0.18em] ${
              dark ? "text-gold-deep" : "text-indigo"
            }`}
          >
            {attribution}
          </figcaption>
        </figure>

        {image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-hairline md:col-span-5">
            <Image src={image.src} alt={image.alt} fill sizes="(min-width: 768px) 35vw, 90vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
