"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { scrollToSection } from "@/lib/scroll";
import Ticker from "@/components/Ticker";
import { useSiteModals } from "@/components/SiteModals";

// Each line gets its own clamp rather than one shared size: at a shared
// ~7rem cap the longest line ("SPEAK BEFORE") overflows its column and
// gets clipped by the line's own overflow-hidden reveal mask, so longer
// lines are capped lower — the size step doubles as some of the
// "staircase" visual rhythm itself.
const HEADLINE_LINES: { text: string; accent?: string; indent: number; size: string }[] = [
  { text: "WHERE", indent: 0, size: "clamp(2.2rem,5.6vw,5.2rem)" },
  { text: "MATERIALS", accent: "-", indent: 1, size: "clamp(1.8rem,4.4vw,3.9rem)" },
  { text: "SPEAK BEFORE", indent: 2, size: "clamp(1.5rem,3.7vw,3.2rem)" },
  { text: "FASHION", accent: "+", indent: 3, size: "clamp(1.9rem,4.8vw,4.4rem)" },
];

// Real people, not material crops — same treatment the reference composition
// uses for every circular avatar in the hero.
const THUMB_ROW = [
  { src: "/people/person1.webp", alt: "" },
  { src: "/people/person3.webp", alt: "" },
  { src: "/people/person5.webp", alt: "" },
];

const GLASS_THUMBS = [
  { src: "/people/person2.webp", alt: "" },
  { src: "/people/person4.webp", alt: "" },
];

// Image band material switcher — the leather crop is the default/first
// option, per the brief ("the first one should be the leather already
// there"), with a few more materials from the asset library to switch
// between via the small circles overlaid top-right on the image. Caption
// + tagline render bottom-left with the Materials-grid scrim treatment;
// origin is deliberately kept to the pan-African framing already used
// elsewhere on the site rather than naming a specific country, since none
// is confirmed for these particular crops.
const MATERIAL_OPTIONS = [
  {
    src: "/materials/Finished-Materials/gator-skin.webp",
    label: "leather",
    alt: "Stacked dyed leather hides in layered colour",
    caption: "Leather · Sourced Across Africa",
    tagline: "Hand-finished technique, generations in the making.",
  },
  {
    src: "/materials/Finished-Materials/mohair-finished-1.webp",
    label: "mohair",
    alt: "Finished mohair textile",
    caption: "Mohair · Sourced Across Africa",
    tagline: "Spun and woven using time-honoured techniques.",
  },
  {
    src: "/materials/Finished-Materials/pineapple-finished-1.webp",
    label: "pineapple leather",
    alt: "Finished pineapple-leather material",
    caption: "Pineapple Leather · Sourced Across Africa",
    tagline: "A plant-based leather alternative, innovation meets tradition.",
  },
  {
    src: "/materials/Finished-Materials/Raffia-dress.jpg",
    label: "raffia",
    alt: "Finished raffia garment",
    caption: "Raffia · Sourced Across Africa",
    tagline: "Hand-woven fibre, a craft passed through generations.",
  },
];

// Small rotating credit line between the CTA row's pills and the buyer
// counter — a lightweight GSAP crossfade, not the hero headline's full
// character-stagger treatment.
const CREDITS = [
  "Organised by Fashion Forum Africa",
  "In partnership with MCPR Africa",
  "Supported by the National Commission on Culture",
  "With the Association of Ghana Industries",
];

const INTRO_PARAGRAPH_1 =
  "Alternative Fashion Fabric Fair is a curated platform redefining the future of fashion by placing African materials at the centre of global design conversations.";

/** Half-gold, half-paper circle glyph used beside the countries metadata label. */
function TwoToneCircle() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="8" r="7" fill="var(--gold)" />
      <path d="M8 1a7 7 0 0 1 0 14z" fill="var(--paper)" />
      <circle cx="8" cy="8" r="7" fill="none" stroke="var(--hairline)" strokeWidth="0.75" />
    </svg>
  );
}

/** Original, simple thread-spool line icon — not a reproduction of any icon set. */
function SpoolIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="shrink-0">
      <line x1="4" y1="4" x2="20" y2="4" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="4" y1="20" x2="20" y2="20" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="7.5" y1="4" x2="7.5" y2="20" stroke="var(--ink)" strokeWidth="1.4" />
      <line x1="16.5" y1="4" x2="16.5" y2="20" stroke="var(--ink)" strokeWidth="1.4" />
      <path
        d="M7.5 7.5 L16.5 10 M7.5 12 L16.5 14.5 M7.5 16.5 L16.5 18.5"
        stroke="var(--gold-deep)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Small rotating credit line, crossfading through CREDITS every few
 * seconds. Reduced motion shows just the first line, statically. */
function RotatingCredits() {
  const textRef = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = textRef.current;
    if (!el) return;

    const id = setInterval(() => {
      gsap.to(el, {
        autoAlpha: 0,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
          setIndex((i) => (i + 1) % CREDITS.length);
          gsap.to(el, { autoAlpha: 1, duration: 0.45, ease: "power2.out" });
        },
      });
    }, 3600);

    return () => clearInterval(id);
  }, []);

  return (
    <span
      ref={textRef}
      className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-deep"
    >
      {CREDITS[index]}
    </span>
  );
}

/** Character-stagger reveal, matching Hero.tsx's headline treatment: each
 * line masked (overflow-hidden) with characters rising up into place. The
 * "-" / "+" accent glyphs render in gold via a separate span. */
function StaircaseHeadline() {
  return (
    <h1 className="font-display uppercase leading-[0.95] tracking-tight text-ink">
      {HEADLINE_LINES.map((line, li) => (
        <span
          key={li}
          className="block overflow-hidden text-right"
          style={{ paddingRight: `${line.indent * 0.9}rem` }}
        >
          <span className="inline-block whitespace-nowrap" style={{ fontSize: line.size }}>
            {line.text.split("").map((ch, ci) => (
              <span key={ci} className="about-hchar inline-block will-change-transform">
                {ch === " " ? " " : ch}
              </span>
            ))}
            {line.accent && (
              <span className="about-hchar inline-block text-gold will-change-transform">
                {" "}
                {line.accent}
              </span>
            )}
          </span>
        </span>
      ))}
    </h1>
  );
}

export default function AboutHero() {
  const container = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const cowrieRef = useRef<HTMLDivElement>(null);
  const [activeMaterial, setActiveMaterial] = useState(0);
  const { openExhibitModal } = useSiteModals();

  // Crossfade the image band's photo on selection instead of an abrupt
  // swap: fade out, swap the src (via the state update), fade back in.
  const handleSelectMaterial = (i: number) => {
    if (i === activeMaterial) return;
    const el = imageRef.current;
    if (prefersReducedMotion() || !el) {
      setActiveMaterial(i);
      return;
    }
    gsap.to(el, {
      opacity: 0,
      duration: 0.22,
      ease: "power2.in",
      onComplete: () => {
        setActiveMaterial(i);
        gsap.to(el, { opacity: 1, duration: 0.32, ease: "power2.out" });
      },
    });
  };

  // Auto-advance through the materials — resets on every change (manual
  // click or auto-advance alike, since this depends on activeMaterial),
  // so a manual click gets a full fresh interval rather than being cut
  // short by whatever was already in flight.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => {
      handleSelectMaterial((activeMaterial + 1) % MATERIAL_OPTIONS.length);
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMaterial]);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();

      if (!reduced) {
        gsap.from(".about-hero-in", {
          y: 26,
          autoAlpha: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
        });
        gsap.from(".about-hchar", {
          yPercent: 110,
          skewY: 8,
          duration: 1,
          ease: "expo.out",
          stagger: 0.014,
          delay: 0.1,
        });

        // Gentle Ken Burns drift on the image band — very slow, subtle.
        if (imageRef.current) {
          gsap.to(imageRef.current, {
            scale: 1.06,
            duration: 16,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }

        // Cowrie shell bounces gently near the top of the composition.
        if (cowrieRef.current) {
          gsap.to(cowrieRef.current, {
            y: -12,
            duration: 1.3,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }
      }
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      aria-label="About Alt.FFF"
      className="relative overflow-hidden bg-paper px-6 pb-20 pt-32 md:px-16 md:pb-28 md:pt-40"
    >
      {/* Decorative diagonal hairline, desktop only, purely atmospheric. */}
      <svg
        aria-hidden="true"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      >
        <line x1="0" y1="12" x2="100" y2="66" stroke="var(--hairline)" strokeWidth="0.12" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Bouncing cowrie shell — floats independently near the top of the
          composition, just above/right of the avatar row. */}
      <div
        ref={cowrieRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-[58%] top-36 hidden h-9 w-9 md:block"
      >
        <Image
          src="/materials/cowrie.png"
          alt=""
          fill
          sizes="36px"
          className="object-contain drop-shadow-[0_8px_12px_rgba(23,28,38,0.28)]"
        />
      </div>

      {/*
        DOM order below is also the mobile visual order (the section is
        only a grid at md: — "mt-*" gaps do the stacking work below that,
        not flex/grid `order`, since `order` has no effect outside a
        flex/grid container). It's written to match the prescribed mobile
        sequence directly: countries label, headline, image band, glass
        card (in flow, inside the image band block), thumbnails row,
        paragraph, CTAs. Desktop placement is entirely controlled by the
        md:col-start/row-start values below, independent of this order, so
        reordering the source doesn't touch the desktop layout.
      */}
      <div className="relative mx-auto max-w-7xl md:grid md:grid-cols-12 md:gap-x-6 md:gap-y-16">
        {/* "+54 countries" metadata label — top row, right side on desktop */}
        <div className="about-hero-in flex items-center gap-2 md:col-start-9 md:col-span-4 md:row-start-1 md:justify-end">
          <TwoToneCircle />
          <span className="text-sm font-semibold uppercase tracking-[0.22em] text-ink">
            +54 Countries
          </span>
        </div>

        {/* Small stacked metadata block — top row, left side on desktop */}
        <div className="about-hero-in mt-10 flex flex-col gap-4 md:col-start-1 md:col-span-3 md:row-start-1 md:mt-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">
              Take a look +
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">
              Alt.FFF 2026
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">FFA</p>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">
              Fashion Forum Africa +
            </p>
          </div>
        </div>

        {/* Headline — dominant right-side element */}
        <div className="mt-10 md:col-start-8 md:col-span-5 md:row-start-2 md:row-span-2 md:mt-0 md:self-start">
          <StaircaseHeadline />
        </div>

        {/* Image band + floating cards — left/center element. Wide and
            short (~60% viewport width, roughly half the height a 4:3 crop
            at that width would be), matching the reference composition. */}
        <div className="about-hero-in relative mt-10 md:col-start-1 md:col-span-7 md:row-start-2 md:row-span-2 md:mt-0 md:self-end">
          <div
            ref={imageRef}
            className="relative aspect-[8/3] overflow-hidden rounded-xl border border-hairline"
          >
            <Image
              src={MATERIAL_OPTIONS[activeMaterial].src}
              alt={MATERIAL_OPTIONS[activeMaterial].alt}
              fill
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover"
              priority
            />

            {/* Material switcher — small circles overlaid top-right (the
                bottom-left corner is now the caption's, below); the active
                one reads as a hollow ring, the rest as solid dots,
                matching a standard carousel-selector idiom. */}
            <div className="absolute right-1 top-1 z-10 flex items-center">
              {MATERIAL_OPTIONS.map((m, i) => (
                <button
                  key={m.src}
                  type="button"
                  aria-label={`Show ${m.label}`}
                  aria-pressed={i === activeMaterial}
                  onClick={() => handleSelectMaterial(i)}
                  className="flex h-11 w-11 items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-4 w-4 rounded-full shadow-[0_1px_4px_rgba(23,28,38,0.35)] transition-all ${
                      i === activeMaterial
                        ? "border-2 border-gold bg-transparent"
                        : "border-2 border-paper/80 bg-paper/70 hover:bg-paper"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Caption — same ink-scrim + white-text treatment as the
                Materials grid cards, updating with the active material. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%]"
              style={{
                background:
                  "linear-gradient(to top, color-mix(in srgb, var(--ink) 85%, transparent), transparent)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="font-display text-lg font-extrabold uppercase leading-none tracking-tight text-paper md:text-xl">
                {MATERIAL_OPTIONS[activeMaterial].caption}
              </p>
              <p className="mt-1.5 max-w-[38ch] text-xs text-paper/75 md:text-sm">
                {MATERIAL_OPTIONS[activeMaterial].tagline}
              </p>
            </div>
          </div>

          {/* Floating glass card — overlaps top-left corner on desktop,
              sits below the image in normal flow on mobile (no overlap). */}
          <div
            className="relative mt-6 w-full max-w-[15rem] rounded-2xl border border-hairline p-4 md:absolute md:-left-6 md:-top-8 md:mt-0"
            style={{
              backgroundColor: "color-mix(in srgb, var(--paper) 72%, transparent)",
              backdropFilter: "blur(10px)",
            }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ink/70">
              Raw &amp; Finished Materials
            </p>
            <Link
              href="/exhibiting"
              className="mt-3 inline-flex items-center rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper transition-opacity hover:opacity-85"
            >
              Exhibit
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex -space-x-2">
                {GLASS_THUMBS.map((t) => (
                  <div
                    key={t.src}
                    className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border-2 border-paper"
                  >
                    <Image src={t.src} alt={t.alt} fill sizes="28px" className="object-cover" />
                  </div>
                ))}
              </div>
              <span className="rounded-full border border-hairline px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-ink/70">
                +100 MFRS
              </span>
            </div>
          </div>

          {/* Small sourcing card — overlaps bottom-right corner on desktop,
              sits below the glass card in flow on mobile (no overlap). */}
          <div className="relative mt-4 w-full max-w-[16rem] rounded-2xl border border-hairline bg-surface p-4 md:absolute md:-bottom-8 md:-right-6 md:mt-0 md:ml-auto">
            <SpoolIcon />
            <p className="mt-2 font-display text-sm font-extrabold uppercase tracking-tight text-ink">
              Sourcing Across Africa
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-indigo">
              Raw fibres, finished textiles, leather, and process-led innovation, all on one floor.
            </p>
          </div>
        </div>

        {/* Three-circle thumbnail row — sits just above the image band on desktop */}
        <div className="about-hero-in mt-10 flex items-center justify-center md:col-start-4 md:col-span-4 md:row-start-1 md:mt-0 md:items-end md:justify-center md:pb-1">
          <div className="flex -space-x-3">
            {THUMB_ROW.map((t, i) => (
              <div
                key={t.src}
                className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-paper ${
                  i === 1 ? "z-10 ring-2 ring-gold" : ""
                }`}
              >
                <Image src={t.src} alt={t.alt} fill sizes="44px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Ticker — replaces the earlier adire swatch, same slot below the
            image band. Reuses Ticker.tsx's own default content (materials
            + event info) rather than inventing new marketing copy. */}
        <div className="about-hero-in mt-10 overflow-hidden rounded-xl border border-hairline md:col-start-1 md:col-span-7 md:row-start-4 md:mt-10">
          <Ticker />
        </div>

        {/* Intro paragraph — below/right of the image band */}
        <p className="about-hero-in mt-6 max-w-[34ch] text-sm leading-relaxed text-ink md:col-start-8 md:col-span-5 md:row-start-4 md:mt-10">
          {INTRO_PARAGRAPH_1}
        </p>

        {/* Bottom CTA row: pill links + counter/buyer pills */}
        <div className="about-hero-in mt-10 flex flex-wrap items-center gap-4 md:col-start-1 md:col-span-11 md:row-start-5 md:mt-16">
          <button
            type="button"
            onClick={() => scrollToSection("#about-content")}
            className="inline-flex items-center rounded-full border border-ink px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Learn more
          </button>
          <button
            type="button"
            onClick={openExhibitModal}
            className="inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
          >
            Apply to exhibit
          </button>

          <RotatingCredits />

          <div className="flex items-center gap-3 md:ml-auto">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-xs font-semibold text-ink">
              01
            </span>
            <span className="inline-flex items-center rounded-full border border-hairline px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink">
              +2,000 Expected Buyers
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
