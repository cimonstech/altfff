"use client";

import { useRef } from "react";
import { Boxes, Hammer, Mic, LayoutGrid, BookOpen, Scissors } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { scrollToSection } from "@/lib/scroll";

const ITEMS = [
  {
    icon: Boxes,
    label: "Showcase of Raw, Semi-Processed & Finished Materials",
  },
  {
    icon: Hammer,
    label: "Installations by Artisans and Makers",
  },
  {
    icon: Mic,
    label: "Panel Talks and Studio Sessions With Industry Leaders",
  },
  {
    icon: LayoutGrid,
    label: "Displays of Innovation and Creative Collaborations",
  },
  {
    icon: BookOpen,
    label: "Stories on Heritage, Sustainability and the Future of Materials",
  },
  {
    icon: Scissors,
    label: "Leather Craft and Tanning",
  },
];

export default function VisitExperience() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".visit-experience-in", {
        y: 28,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.06,
        scrollTrigger: { trigger: container.current, start: "top 75%", once: true },
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      aria-label="What to expect at Alt.FFF"
      className="bg-ink px-6 py-20 text-paper md:px-16 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="visit-experience-in font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase tracking-tight">
          What to Expect
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {ITEMS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="visit-experience-in flex items-start gap-3 rounded-xl border border-paper/15 bg-paper/5 p-5"
            >
              <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-gold" />
              <p className="text-sm leading-relaxed text-paper/85">{label}</p>
            </div>
          ))}
        </div>

        <div className="visit-experience-in mt-14 flex flex-col items-start justify-between gap-6 border-t border-paper/15 pt-10 md:flex-row md:items-center">
          <div>
            <p className="font-display text-xl font-extrabold uppercase tracking-tight md:text-2xl">
              Alt.FFF is the pathway to power your next connection.
            </p>
            <p className="mt-2 max-w-[55ch] text-sm text-paper/70">
              Connect directly with buyers, partners, and industry leaders
              across the textile and fashion value chain, and position your
              business at the centre of Africa&apos;s growing materials and
              manufacturing ecosystem.
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection("#visit-register")}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-ink transition-opacity hover:opacity-85"
          >
            Register to Visit
          </button>
        </div>
      </div>
    </section>
  );
}
