"use client";

import { useRef } from "react";
import { Sparkles, Users, GraduationCap, Briefcase } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { BrandName } from "@/components/BrandName";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const BENEFITS = [
  {
    icon: Sparkles,
    heading: "Discover New Materials & Innovation",
    body: "Explore unique African fibres, fabrics, and textile developments that are shaping the future of sustainable fashion and design.",
  },
  {
    icon: Users,
    heading: "Connect With Industry Leaders",
    body: "Meet designers, manufacturers, suppliers, buyers, investors, and creatives driving change across the industry.",
  },
  {
    icon: GraduationCap,
    heading: "Learn From Experts",
    body: "Gain valuable insights through talks, discussions, and workshops covering trends, sustainability, production, and global opportunities.",
  },
  {
    icon: Briefcase,
    heading: "Find New Business Opportunities",
    body: "Whether you are a brand, retailer, designer, or investor, Alt.FFF creates opportunities for partnerships, sourcing, and growth.",
  },
];

/** Same ghost-numeral card language as SponsorshipBenefits/ExhibitingReasons,
 * with a small line icon added above the heading. */
function BenefitCard({
  index,
  icon: Icon,
  heading,
  body,
}: (typeof BENEFITS)[number] & { index: number }) {
  const numeral = String(index + 1).padStart(2, "0");
  return (
    <div className="visit-benefit-in relative overflow-hidden rounded-xl border border-hairline bg-surface p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-1 -top-8 select-none whitespace-nowrap font-display font-extrabold leading-none text-ink"
        style={{ fontSize: "clamp(4rem, 8vw, 6rem)", opacity: 0.06 }}
      >
        {numeral}
      </span>
      <div className="relative z-10">
        <Icon aria-hidden="true" size={22} className="text-gold-deep" />
        <h3 className="mt-4 font-display text-base font-bold uppercase tracking-tight text-gold-deep">
          {heading}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink">{body}</p>
      </div>
    </div>
  );
}

export default function VisitBenefits() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".visit-benefit-in", {
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
      aria-label="What you'll gain from visiting"
      className="bg-paper px-6 py-20 md:px-16 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase tracking-tight text-ink">
          What Will You Gain From Visiting <BrandName />
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b, i) => (
            <BenefitCard key={b.heading} index={i} {...b} />
          ))}
        </div>
      </div>
    </section>
  );
}
