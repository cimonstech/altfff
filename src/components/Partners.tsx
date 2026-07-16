"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

type Supporter = {
  file: string;
  name: string;
  /** Given more visual prominence per the brief. */
  featured?: boolean;
};

const SUPPORTERS: Supporter[] = [
  { file: "blackStarExperience.png", name: "Black Star Experience", featured: true },
  { file: "agi.png", name: "AGI" },
  { file: "fashionForumAfrica.png", name: "Fashion Forum Africa" },
  { file: "gcf.png", name: "Ghana Culture Forum" },
  { file: "itfpg.png", name: "Institute of Textiles & Fashion Professionals Ghana" },
  { file: "MCPR-Africa.png", name: "MCPR Africa" },
  { file: "ncc.png", name: "National Commission on Culture" },
];

/**
 * One full pass of logos. Rendered twice back to back (see Partners
 * below) so translating the track exactly -50% loops seamlessly — the
 * trailing `pr-14` matches the inter-logo `gap-x-14` so the seam between
 * the two copies reads identically to every other gap, not as a hiccup.
 * The second copy is marked `hidden` so it's invisible to assistive tech;
 * without that, every sponsor's name would be announced twice.
 */
function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center gap-x-14 pr-14"
      aria-hidden={hidden || undefined}
    >
      {SUPPORTERS.map((s) => (
        <div
          key={s.file}
          className={`relative shrink-0 aspect-[18/5] ${s.featured ? "h-14 md:h-16" : "h-10 md:h-12"}`}
        >
          <Image
            src={`/supporters/${s.file}`}
            alt={hidden ? "" : s.name}
            fill
            sizes="200px"
            className="object-contain"
          />
        </div>
      ))}
    </div>
  );
}

export default function Partners() {
  const container = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Continuous, one-direction infinite scroll — no yoyo, so it never
  // reverses once it reaches the end of a pass, it just keeps looping.
  useGSAP(
    () => {
      if (prefersReducedMotion() || !trackRef.current) return;
      gsap.to(trackRef.current, {
        xPercent: -50,
        duration: 26,
        ease: "none",
        repeat: -1,
      });
    },
    { scope: container },
  );

  return (
    <section
      id="sponsorship"
      aria-label="Partners"
      className="border-t border-hairline bg-paper py-16"
    >
      <p className="mb-10 text-center text-[11px] uppercase tracking-[0.24em] text-indigo">
        Partners &amp; Sponsors
      </p>
      <div ref={container} className="overflow-hidden">
        <div ref={trackRef} className="flex w-max items-center">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  );
}
