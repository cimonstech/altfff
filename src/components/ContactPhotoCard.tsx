"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

/** Photo + pull-quote card, right column of the contact grid. The old
 * page's version of this was a straight image caption; this reinterprets
 * it as a small teal panel with oversized gold quote marks, matching the
 * treatment already established for Quote.tsx elsewhere on the site. */
export default function ContactPhotoCard() {
  const container = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        imageRef.current,
        { y: -24 },
        {
          y: 24,
          ease: "none",
          scrollTrigger: {
            trigger: container.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        },
      );
    },
    { scope: container },
  );

  return (
    <div ref={container} className="relative overflow-hidden rounded-xl border border-hairline">
      <div className="relative aspect-[4/5] overflow-hidden">
        <div ref={imageRef} className="absolute inset-x-0" style={{ top: "-6%", height: "112%" }}>
          <Image
            src="/materials/kente-bg.webp"
            alt="Hand-woven kente cloth, strip-woven pattern detail"
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-5 rounded-lg bg-forest p-5 md:p-6">
        <span aria-hidden="true" className="block font-display text-6xl font-extrabold leading-none text-gold">
          &ldquo;
        </span>
        <p className="-mt-2 font-display text-sm font-bold uppercase leading-snug text-paper md:text-base">
          Africa&apos;s materials have long held value.
        </p>
      </div>
    </div>
  );
}
