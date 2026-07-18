"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

type Supporter = { file: string; name: string };

// Two-tier structure. Partners get more visual weight (larger logos,
// its own row) - Black Star Experience's prominence is a consequence of
// it structurally being a Partner, not an arbitrary style bump.
const PARTNERS: Supporter[] = [
  { file: "fashionForumAfrica.png", name: "Fashion Forum Africa" },
  { file: "MCPR-Africa.png", name: "MCPR Africa" },
  { file: "blackStarExperience.png", name: "Black Star Experience" },
];

const COLLABORATORS: Supporter[] = [
  { file: "agi.png", name: "Association of Ghana Industries (AGI)" },
  { file: "ncc.png", name: "National Commission on Culture" },
  { file: "itfpg.png", name: "Institute of Textiles & Fashion Professionals Ghana" },
  { file: "gcf.png", name: "Ghana Culture Forum" },
];

function LogoStrip({ items, size }: { items: Supporter[]; size: "lg" | "sm" }) {
  const boxClass = size === "lg" ? "h-14 w-40 md:h-16 md:w-48" : "h-9 w-32 md:h-10 md:w-36";
  return (
    <div className="flex shrink-0 items-center gap-x-12 pr-12">
      {items.map((s, i) => (
        <div key={`${s.file}-${i}`} className={`relative shrink-0 ${boxClass}`}>
          <Image src={`/supporters/${s.file}`} alt={s.name} fill sizes="200px" className="object-contain" />
        </div>
      ))}
    </div>
  );
}

/** Infinite one-direction marquee, same mechanics as Ticker.tsx: the strip
 * is duplicated back-to-back and translated by exactly one copy's width
 * (xPercent: -50), looping (`repeat: -1`) rather than yoyo-ing — it never
 * reverses direction once it reaches the "end", because there effectively
 * isn't one; the duplicate seam is what makes the loop read as continuous. */
function LogoRow({ items, size }: { items: Supporter[]; size: "lg" | "sm" }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !trackRef.current) return;
    const tween = gsap.to(trackRef.current, {
      xPercent: -50,
      duration: items.length * 4,
      ease: "none",
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, [items.length]);

  return (
    <div className="partner-row overflow-hidden">
      <div ref={trackRef} className="flex w-max">
        <LogoStrip items={items} size={size} />
        <LogoStrip items={items} size={size} />
      </div>
    </div>
  );
}

export default function Partners() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".partner-row", {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.15,
        scrollTrigger: { trigger: container.current, start: "top 80%", once: true },
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="sponsorship"
      aria-label="Partners and collaborators"
      className="border-t border-hairline bg-paper px-6 py-16 md:px-16"
    >
      <div className="mx-auto max-w-5xl">
        <p className="mb-8 text-center text-[11px] uppercase tracking-[0.24em] text-indigo">
          Partners
        </p>
        <LogoRow items={PARTNERS} size="lg" />

        <p className="mb-8 mt-14 text-center text-[11px] uppercase tracking-[0.24em] text-indigo">
          Collaborators
        </p>
        <LogoRow items={COLLABORATORS} size="sm" />
      </div>
    </section>
  );
}


