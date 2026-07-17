"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { scrollToSection } from "@/lib/scroll";
import { MATERIALS } from "@/lib/constants";
import { useSiteModals } from "@/components/SiteModals";

const ROTATE_MS = 6000;
const THUMB = 44; // thumbnail diameter
const THUMB_DISC = 56; // paper backing disc diameter behind each thumbnail
const BLOB_R = 26; // gooey blob radius (slightly larger than thumb radius)

// Left-side scrim over the full-bleed fabric photo, keeping the white
// headline text legible. Peak opacity at the left edge, fading to 0 by the
// horizontal midpoint. A flat value didn't hold up across all six photos
// (kente and raw cotton are both far too light for white text at a low
// peak) — each material now carries its own scrimOpacity in constants.ts,
// tuned by eye; this is just the fallback for one that omits it. The
// scrim div itself renders the gradient at a fixed reference alpha of 1
// and reaches its real per-material peak via the div's own `opacity`
// property instead, so GSAP can animate a single number when the active
// material changes rather than trying to interpolate a gradient string.
const DEFAULT_SCRIM_OPACITY = 0.15;

const HEADLINE = "A FABRIC SPREE OF AFRICAN DESCENT.";

// Giant material word: fixed font-size ceiling. Short words render at this
// size, left-aligned; long words scale down below it just enough to span
// the full content width without wrapping or clipping.
const MAX_WORD_FONT_CLAMP = "clamp(3rem, 12vw, 11rem)";
// Line-box multiplier for the wrapper that holds the giant word. The word
// itself now anchors to the wrapper's bottom edge directly (see the button
// below), so this factor only controls headroom above the glyph — how much
// the wrapper's own overflow:hidden top boundary can clip into a tall
// word — not the bottom anchor point, which no longer depends on this
// value at all. Kept generous as safety margin against font-rendering
// variance across sizes/browsers.
const WORD_HEIGHT_FACTOR = 1.25;

/**
 * Measures each material word's natural width at the max font-size cap and
 * returns a per-word font-size: the cap itself if the word already fits the
 * available content width, otherwise a scaled-down size that makes the word
 * span exactly that width. Recomputes on font load and on resize.
 *
 * Width is the only dimension that needs solving for here: both this probe
 * and the live button share `whiteSpace: nowrap` (see the button below), so
 * a word can never wrap to a second line — scaled sizes only ever shrink
 * from the cap, so the tallest any word's single line box can be is bounded
 * by the cap's own height, which the wrapper is already sized to contain
 * (WORD_HEIGHT_FACTOR). A separate height pass would be solving for a
 * height that's already guaranteed by construction.
 */
function useMaterialWordSizes(words: string[]) {
  const [sizes, setSizes] = useState<number[] | null>(null);
  const [maxFontPx, setMaxFontPx] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const measure = () => {
      // Resolve the CSS clamp() to a real px value for the current viewport.
      const capProbe = document.createElement("span");
      capProbe.style.position = "fixed";
      capProbe.style.visibility = "hidden";
      capProbe.style.fontSize = MAX_WORD_FONT_CLAMP;
      document.body.appendChild(capProbe);
      const maxPx = parseFloat(getComputedStyle(capProbe).fontSize);
      document.body.removeChild(capProbe);

      // Content width = viewport minus the hero's horizontal padding
      // (matches the left column's px-6 / md:px-16).
      const pad = window.innerWidth >= 768 ? 64 : 24;
      const availableWidth = window.innerWidth - pad * 2;

      const textProbe = document.createElement("div");
      textProbe.style.position = "fixed";
      textProbe.style.left = "-9999px";
      textProbe.style.top = "0";
      textProbe.style.visibility = "hidden";
      textProbe.style.whiteSpace = "nowrap";
      textProbe.style.pointerEvents = "none";
      textProbe.className =
        "font-display font-extrabold uppercase leading-none tracking-tight";
      textProbe.style.fontSize = `${maxPx}px`;
      document.body.appendChild(textProbe);

      // Small safety margin: the live <button> measures a hair wider than
      // this probe <div> at the same font-size (sub-pixel font rendering
      // differences), so shrink slightly past the exact ratio to guarantee
      // the scaled word never overshoots the available width.
      const SAFETY = 0.97;
      const newSizes = words.map((w) => {
        textProbe.textContent = w;
        const naturalWidth = textProbe.getBoundingClientRect().width;
        return naturalWidth <= availableWidth
          ? maxPx
          : maxPx * (availableWidth / naturalWidth) * SAFETY;
      });

      document.body.removeChild(textProbe);

      if (!cancelled) {
        setMaxFontPx(maxPx);
        setSizes(newSizes);
      }
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => !cancelled && measure());
    } else {
      measure();
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sizes, maxFontPx };
}

/** Character spans for the load-once headline reveal. */
function HeadlineChars() {
  return (
    <>
      {HEADLINE.split(" ").map((word, wi) => (
        <span key={wi} className="inline-block overflow-hidden pb-[0.06em] align-top">
          <span className="inline-block whitespace-pre">
            {word.split("").map((ch, ci) => (
              <span key={ci} className="hchar inline-block will-change-transform">
                {ch}
              </span>
            ))}
            {wi < HEADLINE.split(" ").length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </>
  );
}

/** Character spans for the giant cropped material word. */
function WordChars({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((ch, i) =>
        ch === " " ? (
          <span key={i} className="inline-block w-[0.24em]" />
        ) : (
          <span key={i} className="wchar inline-block will-change-transform">
            {ch}
          </span>
        ),
      )}
    </>
  );
}

export default function Hero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gooEnabled, setGooEnabled] = useState<boolean | null>(null);
  const { openVisitorModal } = useSiteModals();
  const { sizes: wordFontSizes } = useMaterialWordSizes(
    MATERIALS.map((m) => m.heroWord),
  );

  const container = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const bgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wordRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const svgIndicatorRef = useRef<SVGSVGElement>(null);
  const blobOutRef = useRef<SVGCircleElement>(null);
  const blobInRef = useRef<SVGCircleElement>(null);
  const gooGroupRef = useRef<SVGGElement>(null);
  const crispRef = useRef<SVGCircleElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const prevIndex = useRef(0);

  // Capability check: gooey filter only on capable devices with motion on.
  useEffect(() => {
    const lowEnd =
      (navigator.hardwareConcurrency ?? 8) <= 4 || prefersReducedMotion();
    setGooEnabled(!lowEnd);
  }, []);

  // Auto-rotation: advance every 6s, pause on hover, reset on manual pick
  // (manual setActive re-runs this effect, restarting the timer). Skipped
  // below md — HeroMobile renders there instead, but this component stays
  // mounted (display:none) so its breakpoint can flip with a plain media
  // query with no hydration flash; without this guard its timers and GSAP
  // loops would keep running invisibly and burn the low-end frame budget
  // HeroMobile exists to protect.
  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) return;
    const t = setTimeout(
      () => setActive((a) => (a + 1) % MATERIALS.length),
      ROTATE_MS,
    );
    return () => clearTimeout(t);
  }, [active, paused]);

  // Mount-once animations: headline char reveal, event card idle float,
  // subtle parallax drag on the hero frame.
  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const isMobile =
        typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

      if (!reduced && !isMobile) {
        gsap.from(".hchar", {
          yPercent: 110,
          skewY: 8,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.018,
          delay: 0.15,
        });

        if (cardRef.current) {
          // Idle float amplitude reduced 60% (was -6) — read as too much
          // motion for a small floating card.
          gsap.to(cardRef.current, {
            y: -2.4,
            duration: 2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }

        if (frameRef.current) {
          gsap.to(frameRef.current, {
            y: 12,
            ease: "none",
            scrollTrigger: {
              trigger: container.current,
              start: "top top",
              end: "+=300",
              scrub: 0.6,
            },
          });
        }
      }
    },
    { scope: container },
  );

  const thumbCenter = (i: number) => {
    const el = thumbRefs.current[i];
    if (!el) return { x: THUMB / 2, y: THUMB / 2 };
    return {
      x: el.offsetLeft + THUMB / 2,
      y: el.offsetTop + THUMB / 2,
    };
  };

  // Material-change choreography: background crossfade + settle, giant word
  // swap, and the selector indicator travelling to the new thumbnail.
  useGSAP(
    () => {
      const prev = prevIndex.current;
      const reduced = prefersReducedMotion();
      const bgIn = bgRefs.current[active];
      const bgOut = bgRefs.current[prev];
      const wordIn = wordRefs.current[active];
      const wordOut = wordRefs.current[prev];
      const { x, y } = thumbCenter(active);
      const old = thumbCenter(prev);

      // Gooey liquid merge: an outgoing blob bulges then travels toward the
      // new thumbnail while an incoming blob grows from 0 at the target —
      // their motion paths overlap mid-transition, and the blur+threshold
      // filter fuses the overlap into a bridge that pinches as the outgoing
      // blob shrinks away. A crisp (unfiltered) circle holds the resting
      // state so the indicator isn't fuzzy once settled; the filtered group
      // is only shown for the duration of the transition.
      const placeIndicator = (instant: boolean) => {
        if (gooEnabled) {
          if (
            !crispRef.current ||
            !blobOutRef.current ||
            !blobInRef.current ||
            !gooGroupRef.current
          ) {
            return;
          }
          if (instant) {
            gsap.set(crispRef.current, { attr: { cx: x, cy: y, r: BLOB_R } });
            gsap.set(crispRef.current, { autoAlpha: 1 });
            gsap.set(gooGroupRef.current, { autoAlpha: 0 });
            if (svgIndicatorRef.current) {
              gsap.set(svgIndicatorRef.current, { zIndex: 0 });
            }
            return;
          }

          const DUR = 0.85;
          gsap.set(crispRef.current, { autoAlpha: 0 });
          gsap.set(gooGroupRef.current, { autoAlpha: 1 });
          gsap.set(blobOutRef.current, {
            attr: { cx: old.x, cy: old.y, r: BLOB_R },
          });
          gsap.set(blobInRef.current, { attr: { cx: x, cy: y, r: 0 } });
          // Thumbnails sit at z-10 and are opaque, which would otherwise
          // hide the blob almost entirely. Lift the indicator above them
          // only while it's actively travelling so the stretch/bridge/pinch
          // is visible, then drop it back behind at rest so the crisp
          // circle reads as a halo around the thumbnail, not a cover-up.
          if (svgIndicatorRef.current) {
            gsap.set(svgIndicatorRef.current, { zIndex: 20 });
          }

          gsap
            .timeline({
              onComplete: () => {
                if (!crispRef.current || !gooGroupRef.current) return;
                gsap.set(crispRef.current, {
                  attr: { cx: x, cy: y, r: BLOB_R },
                  autoAlpha: 1,
                });
                gsap.set(gooGroupRef.current, { autoAlpha: 0 });
                if (svgIndicatorRef.current) {
                  gsap.set(svgIndicatorRef.current, { zIndex: 0 });
                }
              },
            })
            // outgoing blob bulges (surface tension gathering to leap)
            .to(
              blobOutRef.current,
              { attr: { r: BLOB_R * 1.3 }, duration: DUR * 0.3, ease: "power2.out" },
              0,
            )
            // ...then travels toward the target, still large — this is what
            // makes its blur radius overlap the growing incoming blob
            .to(
              blobOutRef.current,
              {
                attr: { cx: x, cy: y },
                duration: DUR * 0.65,
                ease: "power1.inOut",
              },
              DUR * 0.1,
            )
            // incoming blob grows from 0, overlapping the outgoing blob
            // while it's still mid-travel/large
            .to(
              blobInRef.current,
              {
                attr: { r: BLOB_R },
                duration: DUR * 0.55,
                ease: "back.out(1.6)",
              },
              DUR * 0.35,
            )
            // outgoing blob pinches off and vanishes, leaving one blob
            .to(
              blobOutRef.current,
              { attr: { r: 0 }, duration: DUR * 0.35, ease: "power2.in" },
              DUR * 0.55,
            );
        } else if (ringRef.current) {
          gsap.to(ringRef.current, {
            x: x - BLOB_R,
            y: y - BLOB_R,
            duration: instant ? 0 : 0.5,
            ease: "expo.inOut",
          });
        }
      };

      // First run (or re-run when goo capability resolves): set states, no tween.
      if (prev === active) {
        placeIndicator(true);
        return;
      }

      const targetScrimOpacity = MATERIALS[active]?.scrimOpacity ?? DEFAULT_SCRIM_OPACITY;

      if (reduced) {
        if (bgOut) gsap.set(bgOut, { autoAlpha: 0 });
        if (bgIn) gsap.set(bgIn, { autoAlpha: 1, scale: 1, x: 0, zIndex: 2 });
        if (scrimRef.current) gsap.set(scrimRef.current, { opacity: targetScrimOpacity });
        if (wordOut) gsap.set(wordOut, { autoAlpha: 0 });
        if (wordIn) {
          gsap.set(wordIn, { autoAlpha: 1 });
          gsap.set(wordIn.querySelectorAll(".wchar"), { yPercent: 0 });
        }
        placeIndicator(true);
        prevIndex.current = active;
        return;
      }

      const tl = gsap.timeline();

      // Background: incoming starts scaled/offset, fades in after the
      // selector starts moving (~0.25s), settles over 1.4s with expo ease.
      // Outgoing fades away underneath. Scrim opacity — a plain number, so
      // GSAP can tween it directly rather than interpolating the gradient
      // string — settles on the same timing so the two read as one change.
      if (bgIn && bgOut) {
        gsap.set(bgIn, { zIndex: 2, autoAlpha: 0, scale: 1.15, x: 40 });
        gsap.set(bgOut, { zIndex: 1 });
        tl.to(bgIn, { autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 0.25)
          .to(bgIn, { scale: 1, x: 0, duration: 1.4, ease: "expo.out" }, 0.25)
          .to(bgOut, { autoAlpha: 0, duration: 0.9, ease: "power2.inOut" }, 0.55);
      }
      if (scrimRef.current) {
        tl.to(
          scrimRef.current,
          { opacity: targetScrimOpacity, duration: 1.4, ease: "expo.out" },
          0.25,
        );
      }

      // Giant word: old exits downward, new rises in, per-character.
      if (wordOut) {
        tl.to(
          wordOut.querySelectorAll(".wchar"),
          { yPercent: 110, duration: 0.45, ease: "power2.in", stagger: 0.02 },
          0,
        ).set(wordOut, { autoAlpha: 0 });
      }
      if (wordIn) {
        tl.set(wordIn, { autoAlpha: 1 }, 0.3).fromTo(
          wordIn.querySelectorAll(".wchar"),
          { yPercent: 110 },
          { yPercent: 0, duration: 0.85, ease: "expo.out", stagger: 0.03 },
          0.3,
        );
      }

      placeIndicator(false);
      prevIndex.current = active;
    },
    { scope: container, dependencies: [active, gooEnabled] },
  );

  const material = MATERIALS[active];

  return (
    <section
      ref={container}
      id="top"
      aria-label="Alt.FFF hero"
      className="relative min-h-svh overflow-hidden bg-paper"
    >
      <div ref={frameRef} className="relative min-h-svh">
        {/* Fabric background layer — full-bleed at every viewport width */}
        <div
          className="absolute inset-0"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {MATERIALS.map((m, i) => (
            <div
              key={m.id}
              ref={(el) => {
                bgRefs.current[i] = el;
              }}
              className="absolute inset-0"
              style={{
                opacity: i === 0 ? 1 : 0,
                visibility: i === 0 ? "visible" : "hidden",
              }}
            >
              <Image
                src={m.background}
                alt={`${m.name} fabric texture, ${m.origin}`}
                fill
                sizes="100vw"
                className="object-cover"
                priority={i < 2}
                fetchPriority={i === 0 ? "high" : undefined}
              />
            </div>
          ))}
        </div>

        {/* Left-side scrim — keeps the white headline legible against the
            full-bleed photo without recreating a solid paper panel. The
            gradient itself is fixed at a reference alpha of 1; the real
            per-material peak (constants.ts, MATERIALS[i].scrimOpacity)
            is reached via this div's own opacity, animated on material
            change alongside the background crossfade above. */}
        <div
          ref={scrimRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{
            background:
              "linear-gradient(to right, rgba(23, 28, 38, 1) 0%, rgba(23, 28, 38, 0) 50%)",
            opacity: MATERIALS[0]?.scrimOpacity ?? DEFAULT_SCRIM_OPACITY,
          }}
        />

        {/* Left column — stable across material changes */}
        <div className="relative z-10 flex min-h-svh max-w-[720px] flex-col justify-center px-6 pt-32 max-md:pb-[30rem] md:px-16 md:pb-40 md:pt-24">
          <h1 className="font-display text-[clamp(2.6rem,6vw,4.9rem)] font-semibold uppercase leading-[0.97] tracking-tight text-paper">
            <HeadlineChars />
          </h1>
          {/* Side by side from md up so the CTA doesn't stack a whole
              extra row of vertical space onto the left column — this is
              what buys the giant material word room to breathe at the
              bottom without the two colliding. Stacks back to
              paragraph-then-button below md, where there isn't enough
              width for both to sit comfortably in one row. */}
          <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
            <p className="max-w-[46ch] text-base text-paper md:text-lg">
              Three days of fibres, dyes, weaves and the people behind them.
              Accra, September 17 to 19, 2026.
            </p>
            <button
              type="button"
              onClick={openVisitorModal}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gold bg-gold px-6 py-3 text-sm font-medium text-paper transition-colors hover:border-gold-deep hover:bg-gold-deep"
            >
              Register for event
              <span aria-hidden>&gt;</span>
            </button>
          </div>
        </div>

        {/* Floating event card — upper right, level with the top of the
            headline rather than the body copy below it, and pulled well
            clear of the thumbnail rail (rail sits at md:right-16 to
            mirror the hero's own left margin; the card's right offset
            gives their gap 100-120px clearance at 1440px+, narrowing at
            smaller breakpoints where there's less room, verified by eye
            per breakpoint rather than computed blind). Vertically
            centered on the thumbnail rail. Opaque white, all content
            always visible (no hover disclosure). */}
        <div
          ref={cardRef}
          className="absolute right-24 top-1/2 z-30 hidden w-36 -translate-y-1/2 rounded-2xl p-6 lg:right-32 lg:w-56 xl:right-48 xl:w-64 md:block"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--hairline)",
          }}
        >
          <p className="text-sm leading-snug text-ink">
            The fair returns. Sept 17 to 19, 2026.
          </p>
          <p className="mt-3 text-xs leading-snug text-ink/70">
            Palm Convention Centre, La Palm Royal Beach Hotel, Accra
          </p>
          <a
            href="#visit"
            className="mt-2 inline-block text-sm font-semibold text-gold"
          >
            Learn more
          </a>
        </div>

        {/* Thumbnail rail — vertical on desktop, horizontal row on mobile.
            Right offset matches the left column's own px-16 (64px) at
            md+, so the rail sits the same distance from the right edge
            as the text content does from the left. */}
        <div
          ref={railRef}
          className="absolute z-30 flex gap-3 max-md:bottom-24 max-md:left-1/2 max-md:-translate-x-1/2 max-md:flex-row md:right-16 md:top-1/2 md:-translate-y-1/2 md:flex-col"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {gooEnabled ? (
            <svg
              ref={svgIndicatorRef}
              aria-hidden
              className="pointer-events-none absolute -inset-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)] overflow-visible"
              style={{ left: "-1rem", top: "-1rem", zIndex: 0 }}
            >
              <defs>
                <filter id="rail-goo">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
                  <feColorMatrix
                    in="blur"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                  />
                </filter>
              </defs>
              <g transform="translate(16 16)">
                <g
                  ref={gooGroupRef}
                  filter="url(#rail-goo)"
                  fill="var(--gold)"
                  style={{ opacity: 0 }}
                >
                  <circle ref={blobOutRef} cx={THUMB / 2} cy={THUMB / 2} r={BLOB_R} />
                  <circle ref={blobInRef} cx={THUMB / 2} cy={THUMB / 2} r={0} />
                </g>
                <circle
                  ref={crispRef}
                  cx={THUMB / 2}
                  cy={THUMB / 2}
                  r={BLOB_R}
                  fill="var(--gold)"
                />
              </g>
            </svg>
          ) : (
            <div
              ref={ringRef}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 rounded-full border-2 border-gold"
              style={{ width: BLOB_R * 2, height: BLOB_R * 2 }}
            />
          )}

          {MATERIALS.map((m, i) => (
            <button
              key={m.id}
              ref={(el) => {
                thumbRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show ${m.name} (${m.origin})`}
              aria-pressed={i === active}
              className="relative z-10 h-11 w-11"
            >
              {/* Backing disc — separates the thumbnail from the busy
                  full-bleed photo behind it. Larger than the thumb (44px)
                  and centered behind it; -z-10 keeps it below both the
                  goo/ring selection indicator and the thumb image, so the
                  existing selection logic (untouched) still reads on top.
                  Lives on the button (not an outer wrapper) so it isn't
                  clipped by the image's own overflow-hidden circle, and so
                  thumbCenter()'s offsetLeft/offsetTop math — which expects
                  the button's offsetParent to stay railRef — is unaffected. */}
              <span
                aria-hidden
                className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper"
                style={{ width: THUMB_DISC, height: THUMB_DISC }}
              />
              {/* Deterministic active-state ring, independent of the goo/
                  crisp indicator above: that halo can read as ambiguous
                  once nearly the same size as the backing disc, so this
                  guarantees a clear, always-correct "which one is active"
                  cue regardless of animation timing. */}
              <span
                className={`block h-full w-full overflow-hidden rounded-full ring-2 ${
                  i === active ? "ring-gold" : "ring-hairline"
                }`}
              >
                <Image
                  src={m.thumbnail}
                  alt=""
                  width={THUMB}
                  height={THUMB}
                  sizes="44px"
                  className="h-full w-full object-cover"
                />
              </span>
            </button>
          ))}
        </div>

        {/* Giant material word. Font-size is per-word: short words render
            at the max cap and left-align under the headline's margin;
            long words scale down just enough to span edge-to-edge of the
            same content width, without wrapping or clipping.
            Each button anchors via `bottom: 0` (not `top: 0`) inside this
            fixed-position wrapper, so its own line box — whatever the
            browser actually computes for that word's specific font-size —
            sits flush against the wrapper's bottom edge directly. That's
            deliberately more robust than positioning from the top and
            trusting a height formula (WORD_HEIGHT_FACTOR) to contain the
            glyph correctly: different font-sizes don't share one exact
            line-height-to-ink ratio, so a top-anchored box sized for the
            largest word could still let a differently-sized word's ink
            print past the wrapper's own bottom edge. Bottom-anchoring
            means every word's baseline sits at the same fixed distance
            from the wrapper's bottom regardless of its font-size, name
            length, or (were it ever to happen) line count. */}
        <div
          className="absolute inset-x-0 z-20 overflow-hidden text-left"
          style={{
            bottom: 12,
            height: `calc(${WORD_HEIGHT_FACTOR} * ${MAX_WORD_FONT_CLAMP})`,
          }}
        >
          {MATERIALS.map((m, i) => (
            <button
              key={m.id}
              ref={(el) => {
                wordRefs.current[i] = el;
              }}
              type="button"
              onClick={() => scrollToSection("#materials")}
              aria-label={`${m.heroWord}, view in materials section`}
              className="absolute bottom-0 left-6 whitespace-nowrap text-left font-display font-extrabold uppercase leading-none tracking-tight text-paper md:left-16 [font-size:clamp(3rem,12vw,11rem)]"
              style={{
                visibility: i === 0 ? "visible" : "hidden",
                fontSize: wordFontSizes ? wordFontSizes[i] : undefined,
              }}
              tabIndex={i === active ? 0 : -1}
            >
              <WordChars text={m.heroWord} />
            </button>
          ))}
        </div>

        <span className="sr-only" aria-live="polite">
          Featured material: {material.name}, {material.origin}
        </span>
      </div>
    </section>
  );
}
