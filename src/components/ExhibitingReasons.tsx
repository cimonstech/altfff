"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const REASONS_WITH_IMAGE = [
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
];

const REASONS_TEXT_ONLY = [
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

export default function ExhibitingReasons() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".reason-card", {
        y: 32,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: container.current, start: "top 72%", once: true },
      });
      gsap.from(".reason-line", {
        y: 20,
        autoAlpha: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: ".reasons-text-only", start: "top 80%", once: true },
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
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase tracking-tight text-ink">
          Reasons to Exhibit
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {REASONS_WITH_IMAGE.map((r) => (
            <div
              key={r.heading}
              className="reason-card flex gap-4 rounded-xl border border-hairline bg-surface p-5"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                <Image src={r.image.src} alt={r.image.alt} fill sizes="64px" className="object-cover" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-tight text-gold-deep">
                  {r.heading}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink">{r.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="reasons-text-only mt-12 flex flex-col gap-8 border-t border-hairline pt-12 md:mt-16 md:pt-16">
          {REASONS_TEXT_ONLY.map((r) => (
            <div key={r.heading} className="reason-line max-w-2xl">
              <h3 className="font-display text-base font-bold uppercase tracking-tight text-gold-deep md:text-lg">
                {r.heading}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink md:text-base">{r.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
