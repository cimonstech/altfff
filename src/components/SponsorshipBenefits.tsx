"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const BENEFITS = [
  {
    heading: "Empowering African Creatives",
    body: "Support designers, artisans, manufacturers, and innovators with a platform to showcase their work, connect with buyers, and grow internationally.",
  },
  {
    heading: "Driving Industry Conversations",
    body: "Fund panels, workshops, and exhibitions on sustainability, intellectual property, ethical production, and the future of fashion in Africa.",
  },
  {
    heading: "Creating Real Opportunities",
    body: "Open doors for emerging talent through mentorships, networking, collaborations, and access to global markets.",
  },
  {
    heading: "Celebrating Innovation & Culture",
    body: "Enable immersive experiences that spotlight African craftsmanship, heritage, textiles, and cutting-edge design.",
  },
  {
    heading: "Strengthening Communities",
    body: "Support local economies and creative networks by helping businesses, makers, and entrepreneurs thrive.",
  },
  {
    heading: "Aligning Your Brand with Purpose",
    body: "Position your organisation as a forward-thinking supporter of diversity, innovation, sustainability, and cultural progress.",
  },
];

/** Ghost-numeral benefit block — same visual language as the Exhibiting
 * page's Reasons cards (ExhibitingReasons.tsx), so the two pages read as
 * part of the same system. */
function BenefitBlock({ index, heading, body }: { index: number; heading: string; body: string }) {
  const numeral = String(index + 1).padStart(2, "0");
  return (
    <div className="benefit-block relative overflow-hidden rounded-xl border border-hairline bg-surface p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-1 -top-8 select-none whitespace-nowrap font-display font-extrabold leading-none text-ink"
        style={{ fontSize: "clamp(4rem, 8vw, 6rem)", opacity: 0.06 }}
      >
        {numeral}
      </span>
      <div className="relative z-10">
        <h3 className="font-display text-base font-bold uppercase tracking-tight text-gold-deep">
          {heading}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink">{body}</p>
      </div>
    </div>
  );
}

export default function SponsorshipBenefits() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".benefit-block", {
        y: 32,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: container.current, start: "top 72%", once: true },
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      aria-label="What your sponsorship fuels"
      className="bg-paper px-6 py-20 md:px-16 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase tracking-tight text-ink">
          What Your Sponsorship Fuels
        </h2>

        <div className="grid gap-5 md:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <BenefitBlock key={b.heading} index={i} {...b} />
          ))}
        </div>
      </div>
    </section>
  );
}
