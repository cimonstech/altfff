"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

// Three.js is only needed for the ambient wireframe moment on the
// Exhibiting page's quote; dynamic + ssr:false keeps it out of every other
// page's bundle and off the server render entirely.
const QuoteWireframe = dynamic(() => import("@/components/QuoteWireframe"), { ssr: false });

const DEFAULT_QUOTE =
  "Africa's fashion story begins with our fabrics, our craftsmanship, and our people. The Alternative Fashion Fabric Fair is a platform that celebrates these strengths while creating opportunities for trade, innovation, and continental collaboration. Through the Black Star Experience, we are connecting African creativity to global markets and positioning Ghana as the home of fashion-led cultural and economic transformation.";
const DEFAULT_ATTRIBUTION =
  "Mr. Rex Owusu Marfo, Presidential Staffer & Coordinator, Black Star Experience";

/** Full-width pull quote, giant madder quotation mark, fade-up reveal.
 * `dark` swaps the homepage's paper/ink treatment for ink/paper (used by
 * the Exhibiting page); `image` adds an optional side photo. */
export default function Quote({
  quote = DEFAULT_QUOTE,
  attribution = DEFAULT_ATTRIBUTION,
  dark = false,
  image,
  ambient3d = false,
}: {
  quote?: string;
  attribution?: string;
  dark?: boolean;
  image?: { src: string; alt: string };
  /** Ambient, ultra-subtle rotating Three.js wireframe behind the quote
   * text - a deliberate one-off mood element, not a general prop for
   * every use of this component. */
  ambient3d?: boolean;
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
        <figure className={`relative ${image ? "md:col-span-7" : "max-w-4xl"}`}>
          {ambient3d && <QuoteWireframe />}
          <span
            aria-hidden
            className="pointer-events-none absolute -left-4 -top-16 font-display text-[8rem] font-extrabold leading-none text-madder md:-left-16 md:text-[10rem]"
          >
            &ldquo;
          </span>
          <blockquote
            className={`relative font-display text-[clamp(1.125rem,2.2vw,1.5rem)] font-semibold leading-relaxed md:leading-snug ${
              dark ? "text-paper" : "text-ink"
            }`}
          >
            {quote}
          </blockquote>
          <figcaption
            className={`relative mt-6 text-sm uppercase tracking-[0.18em] ${
              dark ? "text-madder" : "text-indigo"
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


