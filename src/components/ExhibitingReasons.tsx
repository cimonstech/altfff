"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { useTilt } from "@/lib/use-tilt";

type Reason = {
  heading: string;
  body: string;
  image?: { src: string; alt: string };
};

const REASONS: Reason[] = [
  {
    heading: "Showcase Your Brand to the Right Audience",
    body: "Put your products, services, or expertise in front of industry leaders, buyers, investors, media, and engaged consumers looking for fresh ideas and future-focused brands.",
    image: { src: "/materials/Raw-Materials/leather_hides.jpg", alt: "Tanned leather hides" },
  },
  {
    heading: "Build Valuable Connections",
    body: "Meet designers, manufacturers, retailers, suppliers, and decision-makers who can lead to partnerships, collaborations, and long-term business growth.",
    image: { src: "/materials/Raw-Materials/Raffia.png", alt: "Raw raffia fibre" },
  },
  {
    heading: "Generate New Business Opportunities",
    body: "Exhibiting creates direct access to potential clients and customers, helping you increase sales leads, secure contracts, and expand your reach.",
    image: { src: "/materials/Raw-Materials/Mohair-South-Africa.webp", alt: "Mohair from South Africa" },
  },
  {
    heading: "Position Yourself as an Industry Leader",
    body: "Align your business with innovation, sustainability, diversity, and the future of fashion and manufacturing across Africa and beyond.",
    image: { src: "/materials/Raw-Materials/sisal-Tanzania.jpg", alt: "Raw sisal fibre from Tanzania" },
  },
  {
    heading: "Launch New Products or Services",
    body: "Use the platform to introduce collections, technology, materials, or concepts to an audience ready to discover what's next.",
  },
  {
    heading: "Gain Media & Brand Exposure",
    body: "Benefit from event marketing, social media promotion, and increased visibility before, during, and after the exhibition.",
  },
  {
    heading: "Be Part of a Movement",
    body: "Alt.FFF is more than an exhibition, it's a space driving meaningful change, celebrating creativity, and building stronger global connections for African fashion.",
  },
  {
    heading: "Why It Matters",
    body: "Exhibiting at Alt.FFF means more than taking a stand, it means taking your place in the future of the industry.",
  },
];

/** One card in the list: ghost numeral behind the heading, cursor-tilt on
 * hover (desktop) via the same technique as the hero garments. */
function ReasonCard({ index, heading, body, image }: Reason & { index: number }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  useTilt(stageRef, tiltRef, { maxDeg: 4, duration: 0.5 });

  const numeral = String(index + 1).padStart(2, "0");

  return (
    <div ref={stageRef} className="reason-card relative" style={{ perspective: "800px" }}>
      <div
        ref={tiltRef}
        className="relative flex items-center gap-5 overflow-hidden rounded-xl border border-hairline bg-surface p-5 md:p-6"
        style={{ transformStyle: "preserve-3d" }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-1 -top-8 select-none whitespace-nowrap font-display font-extrabold leading-none text-ink"
          style={{ fontSize: "clamp(4rem, 9vw, 6.5rem)", opacity: 0.06 }}
        >
          {numeral}
        </span>
        {image && (
          <div className="relative z-10 h-16 w-16 shrink-0 overflow-hidden rounded-lg">
            <Image src={image.src} alt={image.alt} fill sizes="64px" className="object-cover" />
          </div>
        )}
        <div className="relative z-10">
          <h3 className="font-display text-sm font-bold uppercase tracking-tight text-gold-deep md:text-base">
            {heading}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">{body}</p>
        </div>
      </div>
    </div>
  );
}

/** Thin gold thread threading top-to-bottom between the 8 cards. Draws
 * itself via stroke-dashoffset scrubbed to scroll progress. Under reduced
 * motion it's simply shown fully drawn, no scroll-linked animation. */
function ConnectingLine() {
  const pathRef = useRef<SVGPathElement>(null);

  // No `scope` here deliberately: every GSAP target below is an explicit
  // element ref, not a string selector, so scoping isn't functionally
  // needed. Also deliberately NOT using the parent's `listRef` directly —
  // React attaches a child's layout effects before its parent's own ref,
  // so `listRef.current` is still null whenever this component's effect
  // runs. That was producing GSAP's "Invalid scope" warning, and (worse)
  // a ScrollTrigger created with a null trigger, which was corrupting
  // ScrollTrigger.refresh() for sibling triggers elsewhere on the page.
  // Resolving the same container via this component's own ref instead
  // (`pathRef`, safely attached by the time this effect runs) sidesteps
  // the cross-component ref-timing issue entirely.
  useGSAP(() => {
    const path = pathRef.current;
    const trigger = path?.closest("svg")?.parentElement;
    if (!path || !trigger) return;
    const length = path.getTotalLength();

    if (prefersReducedMotion()) {
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: 0 });
      return;
    }

    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    gsap.to(path, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        trigger,
        start: "top 75%",
        end: "bottom 65%",
        scrub: true,
      },
    });
  });

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -left-6 top-0 hidden h-full w-6 md:block"
      viewBox="0 0 8 1000"
      preserveAspectRatio="none"
    >
      <path ref={pathRef} d="M4 0 L4 1000" stroke="var(--gold)" strokeWidth="1.5" fill="none" opacity="0.45" />
    </svg>
  );
}

export default function ExhibitingReasons() {
  const container = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".reason-card", {
        y: 32,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: listRef.current, start: "top 72%", once: true },
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      aria-label="Reasons to exhibit"
      className="bg-paper px-6 py-20 md:px-16 md:py-28"
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-12 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase tracking-tight text-ink">
          Reasons to Exhibit
        </h2>

        <div ref={listRef} className="relative flex flex-col gap-5 md:pl-2">
          <ConnectingLine />
          {REASONS.map((r, i) => (
            <ReasonCard key={r.heading} index={i} {...r} />
          ))}
        </div>
      </div>
    </section>
  );
}
