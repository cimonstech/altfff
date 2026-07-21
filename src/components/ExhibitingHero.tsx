"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { useTilt } from "@/lib/use-tilt";
import HeroArtifacts from "@/components/HeroArtifacts";
import { useSiteModals } from "@/components/SiteModals";

const INTRO_PARAGRAPH =
  "Exhibiting at Alt.FFF is an opportunity to place your brand at the centre of one of the most exciting conversations in fashion, manufacturing, and African creative enterprise. It's where innovation meets opportunity, and where businesses gain visibility, connections, and real commercial potential.";

const GARMENTS = [
  {
    src: "/materials/hero-garments/croc-jacket.png",
    alt: "Embossed crocodile-pattern leather jacket",
  },
  {
    src: "/materials/hero-garments/raffia-dress.png",
    alt: "Raffia fibre dress with a fringed trim",
  },
  {
    src: "/materials/hero-garments/pineapple_finished.png",
    alt: "Garment made from finished pineapple-leather material",
  },
];

const ROTATE_MS = 5500;
const MAX_TILT_DEG = 6; // within the requested 4-8° range

export default function ExhibitingHero() {
  const container = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null); // perspective parent
  const tiltRef = useRef<HTMLDivElement>(null); // the element actually rotated
  const garmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const spoolRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const pausedRef = useRef(false);
  const idleTweensRef = useRef<(gsap.core.Tween | null)[]>(
    GARMENTS.map(() => null),
  );
  const { openExhibitModal } = useSiteModals();

  // Garment rotation: slide-down entrance, slide-down-and-fade exit,
  // gentle idle float once resting. Reduced motion: first garment shown
  // statically, no timer, no float, no tilt.
  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const layers = garmentRefs.current;
      if (layers.slice(0, GARMENTS.length).some((l) => !l)) return;

      const STAGE_OFFSET = 260; // px the incoming garment starts above rest

      if (reduced) {
        gsap.set(layers[0], { y: 0, autoAlpha: 1 });
        for (let i = 1; i < GARMENTS.length; i++) {
          gsap.set(layers[i], { y: -STAGE_OFFSET, autoAlpha: 0 });
        }
        return;
      }

      const startIdleFloat = (i: number) => {
        idleTweensRef.current[i]?.kill();
        idleTweensRef.current[i] = gsap.to(layers[i], {
          y: "+=10",
          duration: 3.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      };

      // Mount-once entrance for the first garment; the rest stay hidden
      // above the frame, ready for their turn in the rotation.
      for (let i = 1; i < GARMENTS.length; i++) {
        gsap.set(layers[i], { y: -STAGE_OFFSET, autoAlpha: 0 });
      }
      gsap.fromTo(
        layers[0],
        { y: -STAGE_OFFSET, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 1,
          ease: "power3.out",
          onComplete: () => startIdleFloat(0),
        },
      );

      const advance = () => {
        const outIndex = activeIndexRef.current;
        const inIndex = (outIndex + 1) % GARMENTS.length;
        activeIndexRef.current = inIndex;

        idleTweensRef.current[outIndex]?.kill();
        idleTweensRef.current[inIndex]?.kill();

        gsap.set(layers[inIndex], { y: -STAGE_OFFSET, autoAlpha: 0 });

        // Outgoing continues its downward motion while fading; incoming
        // slides down from above at the same time - an overlapping
        // crossfade-with-motion instead of a hard instant swap.
        gsap.to(layers[outIndex], {
          y: "+=50",
          autoAlpha: 0,
          duration: 0.6,
          ease: "power2.in",
        });
        gsap.fromTo(
          layers[inIndex],
          { y: -STAGE_OFFSET, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.9,
            ease: "power3.out",
            onComplete: () => startIdleFloat(inIndex),
          },
        );
      };

      const id = setInterval(() => {
        if (!pausedRef.current) advance();
      }, ROTATE_MS);

      return () => clearInterval(id);
    },
    { scope: container },
  );

  // Cursor-follow tilt on the garment stage - shared with the Reasons
  // cards' hover-tilt via src/lib/use-tilt.ts.
  useTilt(stageRef, tiltRef, { maxDeg: MAX_TILT_DEG });

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".exhibit-hero-in", {
        y: 26,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.1,
      });

      // Kente spool floats gently in the gap between the headline and the
      // garment stage.
      if (spoolRef.current) {
        gsap.to(spoolRef.current, {
          y: -14,
          rotation: -8,
          duration: 1.9,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="exhibiting-hero"
      aria-label="Why exhibit at Alt.FFF"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      className="relative overflow-hidden bg-ink px-6 pb-20 pt-32 md:px-16 md:pb-28 md:pt-40"
    >
      {/* Background photo with a faint dark overlay for text legibility. */}
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src="/materials/exhibition-bg.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-ink/70" />
      </div>

      {/* Massive, barely-visible background wordmark - light-on-dark this
          time, same technique as the light-mode version. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <span
          className="select-none whitespace-nowrap font-display font-extrabold uppercase leading-none text-paper"
          style={{ fontSize: "clamp(9rem, 30vw, 28rem)", opacity: 0.08 }}
        >
          EXHIBIT
        </span>
      </div>

      <HeroArtifacts variant="dark" layout="exhibiting" density={2} />

      <div className="relative mx-auto max-w-7xl">
        {/* Small metadata pill, top-right */}
        <div className="exhibit-hero-in flex justify-end">
          <span className="inline-flex items-center rounded-full border border-paper/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-paper">
            Open Call · 2026
          </span>
        </div>

        <div className="relative mt-10 md:grid md:grid-cols-12 md:items-end md:gap-x-8">
          {/* Kente spool - floats in the gap between the headline and the
              garment stage, roughly mid-height of the composition. */}
          <div
            ref={spoolRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-[56%] top-1/2 hidden h-14 w-14 -translate-y-1/2 md:block"
          >
            <Image
              src="/materials/kente-spool.png"
              alt=""
              fill
              sizes="56px"
              className="object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)]"
            />
          </div>

          {/* Left: headline, intro paragraph */}
          <div className="md:col-span-7">
            <h1 className="exhibit-hero-in font-display text-[clamp(2.2rem,6vw,4.5rem)] font-extrabold uppercase leading-[1.03] tracking-tight text-paper">
              Why Exhibit at Alt.FFF?
            </h1>
            <p className="exhibit-hero-in mt-6 max-w-[60ch] text-base leading-relaxed text-paper/75 md:text-lg">
              {INTRO_PARAGRAPH}
            </p>
          </div>

          {/* Right: rotating garment stage + floating register CTA card */}
          <div className="exhibit-hero-in relative mt-12 md:col-span-5 md:mt-0">
            <div
              ref={stageRef}
              className="relative h-[380px] md:h-[480px]"
              style={{ perspective: "1000px" }}
            >
              {/* Rim-light glow behind the garment */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  background:
                    "radial-gradient(closest-side, color-mix(in srgb, var(--gold) 35%, transparent), transparent)",
                  filter: "blur(40px)",
                }}
              />
              {/* Soft contact shadow beneath the garment */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-4 left-1/2 h-10 w-2/3 -translate-x-1/2 rounded-full bg-black/50"
                style={{ filter: "blur(20px)" }}
              />

              <div
                ref={tiltRef}
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
              >
                {GARMENTS.map((g, i) => (
                  <div
                    key={g.src}
                    ref={(el) => {
                      garmentRefs.current[i] = el;
                    }}
                    className="absolute inset-0 flex items-end justify-center"
                    style={{ opacity: 0 }}
                  >
                    <div className="relative h-full w-full">
                      <Image
                        src={g.src}
                        alt={g.alt}
                        fill
                        sizes="(min-width: 768px) 32vw, 70vw"
                        className="object-contain object-bottom drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]"
                        priority={i === 0}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="relative mt-6 w-full max-w-[16rem] rounded-2xl border border-hairline p-4 md:absolute md:-bottom-4 md:-left-8 md:mt-0"
              style={{
                backgroundColor: "color-mix(in srgb, var(--paper) 92%, transparent)",
                backdropFilter: "blur(10px)",
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70">
                Open Call · Accra 2026
              </p>
              <button
                type="button"
                onClick={openExhibitModal}
                className="mt-3 inline-flex items-center rounded-full bg-madder px-4 py-2.5 text-xs font-semibold text-paper transition-opacity hover:opacity-85"
              >
                Register to Exhibit
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


