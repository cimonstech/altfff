"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

export type HeroArtifactsVariant = "dark" | "light";
export type HeroArtifactsLayout = "exhibiting" | "sponsorship" | "contact" | "visit" | "news";

type CowriePlacement = {
  top: string;
  left: string;
  size: number; // px
  rotation: number; // base rotation, degrees
  floatAmplitude: number; // px, one-way (yoyo doubles the travel)
  floatDuration: number; // seconds, one-way
};

type CottonPlacement = {
  top: string;
  left: string;
  size: number; // px
  opacity: number;
  floatAmplitude: number;
  floatDuration: number;
};

type LayoutConfig = {
  cowrie: CowriePlacement;
  cotton: CottonPlacement[];
};

// One config map, one file - placements are percent-based (top/left) so
// they hold their position across viewport widths, tuned per hero to
// stay clear of headline/CTA text and (on /exhibiting) the garment stage.
// Adjust freely; nothing here is referenced anywhere else.
const LAYOUTS: Record<HeroArtifactsLayout, LayoutConfig> = {
  exhibiting: {
    cowrie: { top: "14%", left: "5%", size: 34, rotation: -8, floatAmplitude: 10, floatDuration: 7 },
    cotton: [
      { top: "78%", left: "16%", size: 26, opacity: 0.3, floatAmplitude: 14, floatDuration: 9 },
      { top: "10%", left: "44%", size: 18, opacity: 0.22, floatAmplitude: 11, floatDuration: 8 },
    ],
  },
  sponsorship: {
    cowrie: { top: "20%", left: "88%", size: 34, rotation: 10, floatAmplitude: 9, floatDuration: 6.5 },
    cotton: [
      { top: "72%", left: "80%", size: 24, opacity: 0.28, floatAmplitude: 12, floatDuration: 8.5 },
      { top: "12%", left: "68%", size: 18, opacity: 0.22, floatAmplitude: 10, floatDuration: 7.5 },
    ],
  },
  contact: {
    cowrie: { top: "70%", left: "90%", size: 30, rotation: -6, floatAmplitude: 8, floatDuration: 7 },
    cotton: [
      { top: "18%", left: "82%", size: 22, opacity: 0.28, floatAmplitude: 11, floatDuration: 8 },
      { top: "40%", left: "92%", size: 16, opacity: 0.2, floatAmplitude: 9, floatDuration: 9 },
    ],
  },
  visit: {
    cowrie: { top: "22%", left: "90%", size: 32, rotation: 6, floatAmplitude: 10, floatDuration: 8 },
    cotton: [
      { top: "75%", left: "84%", size: 24, opacity: 0.26, floatAmplitude: 13, floatDuration: 9 },
      { top: "55%", left: "94%", size: 16, opacity: 0.2, floatAmplitude: 10, floatDuration: 7 },
    ],
  },
  news: {
    // Kept in the upper ~70% of the hero - the ticker strip runs across
    // the bottom edge and would just paint over anything placed lower.
    cowrie: { top: "22%", left: "88%", size: 32, rotation: -10, floatAmplitude: 9, floatDuration: 7.5 },
    cotton: [
      { top: "55%", left: "80%", size: 22, opacity: 0.28, floatAmplitude: 12, floatDuration: 8 },
      { top: "16%", left: "68%", size: 16, opacity: 0.2, floatAmplitude: 10, floatDuration: 8.5 },
    ],
  },
};

const MAX_PARALLAX = 14; // px, cowrie's max mouse-parallax translation
const COTTON_PARALLAX_FACTOR = 0.5; // depth separation - cotton drifts less than the cowrie

type Proxy = { floatY: number; rotDrift: number; parX: number; parY: number };

export default function HeroArtifacts({
  variant,
  layout,
  density = 2,
}: {
  variant: HeroArtifactsVariant;
  layout: HeroArtifactsLayout;
  density?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cowrieElRef = useRef<HTMLDivElement>(null);
  const cottonElRefs = useRef<(HTMLDivElement | null)[]>([]);

  const config = LAYOUTS[layout];
  const cottonPlacements = config.cotton.slice(0, Math.max(1, density));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduced = prefersReducedMotion();
    const cowrieEl = cowrieElRef.current;
    const cottonEls = cottonElRefs.current.filter((el): el is HTMLDivElement => el !== null);

    if (reduced) {
      // Static at base positions - no loops, no parallax. Rotation is
      // already applied via the inline style below, nothing else to do.
      return;
    }

    // Every artifact drives its own plain proxy object; a single
    // applyTransform() per element composes the FULL transform string by
    // hand and writes it once. This is deliberate, not incidental: GSAP's
    // independent-transform detection collides with Tailwind's preflight
    // (which sets translate/rotate/scale: none on every element), and
    // asking GSAP to animate more than one transform-related property on
    // the same element via separate tweens/quickTo calls has silently
    // dropped tweens elsewhere in this project (the hero garment tilt,
    // the footer's magnetic letters). Routing everything through one
    // proxy + one manual write sidesteps that class of bug entirely.
    const tweens: gsap.core.Tween[] = [];
    const quickSetters: { x: (v: number) => void; y: (v: number) => void }[] = [];

    const setUpArtifact = (
      el: HTMLDivElement,
      baseRotation: number,
      floatAmplitude: number,
      floatDuration: number,
      parallaxFactor: number,
    ) => {
      const proxy: Proxy = { floatY: 0, rotDrift: 0, parX: 0, parY: 0 };
      const apply = () => {
        el.style.transform = `translate(${proxy.parX.toFixed(2)}px, ${(proxy.floatY + proxy.parY).toFixed(2)}px) rotate(${(baseRotation + proxy.rotDrift).toFixed(2)}deg)`;
      };

      tweens.push(
        gsap.to(proxy, {
          floatY: -floatAmplitude,
          duration: floatDuration,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          onUpdate: apply,
        }),
      );
      tweens.push(
        gsap.to(proxy, {
          rotDrift: gsap.utils.random(-4, 4),
          duration: floatDuration * 1.3,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          onUpdate: apply,
        }),
      );

      if (window.matchMedia("(pointer: fine)").matches) {
        const setX = gsap.quickTo(proxy, "parX", { duration: 0.6, ease: "power3", onUpdate: apply });
        const setY = gsap.quickTo(proxy, "parY", { duration: 0.6, ease: "power3", onUpdate: apply });
        quickSetters.push({
          x: (v: number) => setX(v * parallaxFactor),
          y: (v: number) => setY(v * parallaxFactor),
        });
      }

      apply();
    };

    if (cowrieEl) setUpArtifact(cowrieEl, config.cowrie.rotation, config.cowrie.floatAmplitude, config.cowrie.floatDuration, 1);
    cottonEls.forEach((el, i) => {
      const p = cottonPlacements[i];
      if (p) setUpArtifact(el, 0, p.floatAmplitude, p.floatDuration, COTTON_PARALLAX_FACTOR);
    });

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      quickSetters.forEach((s) => {
        s.x(px * 2 * MAX_PARALLAX);
        s.y(py * 2 * MAX_PARALLAX);
      });
    };
    const onPointerLeave = () => {
      quickSetters.forEach((s) => {
        s.x(0);
        s.y(0);
      });
    };
    if (quickSetters.length > 0) {
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerleave", onPointerLeave);
    }

    // Pause the float/drift loops entirely while the hero is off-screen -
    // no point burning frames animating something nobody can see.
    const io = new IntersectionObserver(
      ([entry]) => {
        tweens.forEach((t) => (entry.isIntersecting ? t.resume() : t.pause()));
      },
      { threshold: 0 },
    );
    io.observe(container);

    return () => {
      io.disconnect();
      tweens.forEach((t) => t.kill());
      if (quickSetters.length > 0) {
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
      }
    };
  }, [layout, density, config, cottonPlacements]);

  const cottonColor = variant === "dark" ? "#F6F1E7" : "#FFFFFF";

  return (
    <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={cowrieElRef}
        className="absolute scale-[0.72] md:scale-100"
        style={{
          top: config.cowrie.top,
          left: config.cowrie.left,
          width: config.cowrie.size,
          height: config.cowrie.size,
          zIndex: 5,
          transform: `rotate(${config.cowrie.rotation}deg)`,
          transformOrigin: "center",
        }}
      >
        <Image
          src="/materials/cowrie.png"
          alt=""
          fill
          sizes={`${config.cowrie.size}px`}
          className="object-contain drop-shadow-[0_8px_12px_rgba(23,28,38,0.28)]"
        />
      </div>

      {cottonPlacements.map((c, i) => (
        <div
          key={i}
          ref={(el) => {
            cottonElRefs.current[i] = el;
          }}
          className={`absolute scale-[0.72] rounded-full md:scale-100 ${i > 0 ? "hidden md:block" : ""}`}
          style={{
            top: c.top,
            left: c.left,
            width: c.size,
            height: c.size,
            zIndex: 4,
            opacity: c.opacity,
            background: cottonColor,
            filter: `blur(${Math.max(3, c.size / 6)}px)`,
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
}


