"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

type Supporter = { file: string; name: string };

// Partners row — primary institutional partners (larger logos).
const PARTNERS: Supporter[] = [
  { file: "blackStarExperience.png", name: "Black Star Experience" },
  { file: "MCPR-Africa.png", name: "MCPR Africa" },
  { file: "fashionForumAfrica.png", name: "Fashion Forum Africa" },
];

const SUPPORTERS: Supporter[] = [
  { file: "agi.png", name: "Association of Ghana Industries (AGI)" },
  {
    file: "itfpg.png",
    name: "Institute of Textiles & Fashion Professionals Ghana (ITFPG)",
  },
  { file: "gcf.png", name: "Ghana Culture Forum" },
  { file: "ncc.png", name: "National Commission on Culture" },
];

const SPONSORS: Supporter[] = [{ file: "dimo.png", name: "DIMO" }];

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
 * (xPercent: -50), looping (`repeat: -1`) rather than yoyo-ing - it never
 * reverses direction once it reaches the "end", because there effectively
 * isn't one; the duplicate seam is what makes the loop read as continuous. */
function LogoRow({
  items,
  size,
  mobileOnly = false,
}: {
  items: Supporter[];
  size: "lg" | "sm";
  /** When true, marquee runs only below the `md` breakpoint. */
  mobileOnly?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const mq = mobileOnly ? window.matchMedia("(max-width: 767px)") : null;

    const stop = () => {
      tweenRef.current?.kill();
      tweenRef.current = null;
      gsap.set(track, { xPercent: 0 });
    };

    const start = () => {
      stop();
      if (prefersReducedMotion()) return;
      if (mobileOnly && mq && !mq.matches) return;
      tweenRef.current = gsap.to(track, {
        xPercent: -50,
        duration: items.length * 4,
        ease: "none",
        repeat: -1,
      });
    };

    start();
    mq?.addEventListener("change", start);
    return () => {
      mq?.removeEventListener("change", start);
      stop();
    };
  }, [items.length, mobileOnly]);

  return (
    <div className="overflow-hidden">
      <div ref={trackRef} className="flex w-max">
        <LogoStrip items={items} size={size} />
        <LogoStrip items={items} size={size} />
      </div>
    </div>
  );
}

function StaticLogoRow({
  items,
  size,
  className = "sponsor-row",
}: {
  items: Supporter[];
  size: "lg" | "sm";
  className?: string;
}) {
  const boxClass = size === "lg" ? "h-14 w-40 md:h-16 md:w-48" : "h-9 w-32 md:h-10 md:w-36";
  return (
    <div className={`${className} flex flex-wrap items-center justify-center gap-x-12 gap-y-6`}>
      {items.map((s) => (
        <div key={s.file} className={`relative shrink-0 ${boxClass}`}>
          <Image src={`/supporters/${s.file}`} alt={s.name} fill sizes="200px" className="object-contain" />
        </div>
      ))}
    </div>
  );
}

/** Partners row: marquee on mobile, static on md+. */
function PartnersLogoRow({ items, size }: { items: Supporter[]; size: "lg" | "sm" }) {
  return (
    <>
      <div className="partner-row md:hidden">
        <LogoRow items={items} size={size} mobileOnly />
      </div>
      <StaticLogoRow
        items={items}
        size={size}
        className="partner-row-static hidden md:flex"
      />
    </>
  );
}

export default function Partners() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".partner-in, .partner-row, .partner-row-static, .sponsor-row", {
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
      aria-label="Our partners and supporters"
      className="border-t border-hairline bg-paper px-6 py-16 md:px-16"
    >
      <div className="mx-auto max-w-5xl">
        <div className="partner-in mb-12 text-center">
          <h2 className="font-display text-[clamp(2rem,5vw,3.25rem)] font-extrabold uppercase tracking-tight text-ink">
            Our Partners &amp; Supporters
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-sm leading-relaxed text-indigo md:text-base">
            Working together to strengthen Africa&apos;s fashion, textile and material ecosystem
          </p>
        </div>

        <p className="partner-in mb-8 text-center text-[11px] uppercase tracking-[0.24em] text-indigo">
          Partners
        </p>
        <PartnersLogoRow items={PARTNERS} size="lg" />

        <p className="partner-in mb-8 mt-14 text-center text-[11px] uppercase tracking-[0.24em] text-indigo">
          Supporters
        </p>
        <div className="partner-row">
          <LogoRow items={SUPPORTERS} size="sm" />
        </div>

        <p className="partner-in mb-8 mt-14 text-center text-[11px] uppercase tracking-[0.24em] text-indigo">
          Sponsor
        </p>
        <StaticLogoRow items={SPONSORS} size="sm" />
      </div>
    </section>
  );
}


