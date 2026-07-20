"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { MATERIALS } from "@/lib/constants";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import Ticker from "@/components/Ticker";

 // Swap to "ACCRA 2026" to compare - the period in "Alt.FFF" leaves a small
// visual gap once rotated into the vertical column; "ACCRA 2026" reads a
// touch more evenly at this size but loses the wordmark. Default to the
// wordmark since it doubles as brand reinforcement.
const VERTICAL_WORD = "Alt.FFF";

/**
 * Mobile-only (below md) full-bleed editorial hero. Deliberately a separate
 * component from Hero.tsx, not a breakpoint variant of it - the two share
 * only a background image source; the desktop rail/rotation/gooey-selector
 * system has no mobile equivalent here (static image instead, to keep the
 * low-end frame budget for scroll rather than a material carousel).
 */
export default function HeroMobile() {
  const container = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const clusterRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.set(imgRef.current, { scale: 1.06 });
      gsap.set(wordRef.current, { x: 10, autoAlpha: 0 });
      gsap.set(clusterRef.current, { y: 18, autoAlpha: 0 });

      const tl = gsap.timeline({ delay: 0.1 });
      tl.to(imgRef.current, { scale: 1, duration: 1.3, ease: "power3.out" }, 0)
        .to(wordRef.current, { x: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.15)
        .to(clusterRef.current, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.3);
    },
    { scope: container },
  );
  const [active, setActive] = useState(0);

  // Build mobile-specific order: start with cotton, keep kente last
  const mobileMaterials = (() => {
    const m = MATERIALS.slice();
    const cottonIdx = m.findIndex((x) => x.id === "cotton");
    const kenteIdx = m.findIndex((x) => x.id === "kente");
    const cotton = cottonIdx >= 0 ? m.splice(cottonIdx, 1)[0] : null;
    const kente = kenteIdx >= 0 ? m.splice(m.findIndex((x) => x.id === "kente"), 1)[0] : null;
    const ordered = [] as typeof MATERIALS;
    if (cotton) ordered.push(cotton);
    ordered.push(...m);
    if (kente) ordered.push(kente);
    return ordered;
  })();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => {
      setActive((a) => (a + 1) % mobileMaterials.length);
    }, 6000);
    return () => clearInterval(t);
  }, [mobileMaterials]);

  const current = mobileMaterials[active];

  return (
    <section
      ref={container}
      aria-label="Alt.FFF - before fashion, there are materials"
      className="relative h-[100dvh] w-full overflow-hidden bg-ink"
    >
      <div ref={imgRef} className="absolute inset-0">
        <Image
          src={current.background}
          alt={`${current.name} background`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Bottom-weighted scrim - keeps the text cluster legible without
          flattening the photo everywhere else. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(23,28,38,0.88) 0%, rgba(23,28,38,0.45) 32%, rgba(23,28,38,0.05) 58%, rgba(23,28,38,0) 72%)",
        }}
      />

      {/* Oversized vertical wordmark, right edge - intentionally overflows
          top/bottom at this font-size. Duplicates the logo in Nav, so it's
          hidden from assistive tech. */}
      <span
        ref={wordRef}
        aria-hidden="true"
        className="pointer-events-none absolute right-1 top-1/2 select-none whitespace-nowrap font-display font-extrabold uppercase leading-none text-paper/25"
        style={{
          writingMode: "vertical-rl",
          transform: "translateY(-50%) rotate(180deg)",
          fontSize: "clamp(4.5rem, 21dvh, 9rem)",
          letterSpacing: "-0.01em",
        }}
      >
        {VERTICAL_WORD}
      </span>

      {/* Bottom-left headline cluster. right-24 keeps it clear of the
          vertical word at every width down to 360px. */}
      <div ref={clusterRef} className="absolute bottom-16 left-5 right-24 z-10">
        <h1 className="font-display text-[clamp(1.9rem,8.5vw,2.75rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-paper">
          Before Fashion,
          <br />
          There Are <span className="text-gold">Materials</span>
        </h1>
        <p className="mt-3 text-sm text-paper/60">
          September 17 to 19, 2026 &middot; Accra
        </p>
        <p className="mt-3 text-sm text-paper/70">
          This exhibition spotlights the raw, processed, and semi-processed materials that power the industry.
        </p>
        <Link
          href="/exhibiting"
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-paper px-6 py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-85"
        >
          Exhibit With Us
        </Link>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10">
        <Ticker dense />
      </div>
    </section>
  );
}


