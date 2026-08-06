"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

/*
type Package = {
  name: string;
  size: string;
  location: string;
  power: string;
  table: string;
  chairs: string;
  cost: string;
  highlight?: boolean;
};

const PACKAGES: Package[] = [
  {
    name: "Standard Booth",
    size: "3m x 3m",
    location: "Open space",
    power: "Included",
    table: "1",
    chairs: "2",
    cost: "GHS 8,400",
  },
  {
    name: "Medium Booth",
    size: "3m x 4m",
    location: "Scattered",
    power: "Included",
    table: "2",
    chairs: "4",
    cost: "GHS 11,500",
  },
  {
    name: "Premium Booth",
    size: "3m x 6m",
    location: "Prime location",
    power: "Included",
    table: "2",
    chairs: "4",
    cost: "GHS 16,500",
    highlight: true,
  },
  {
    name: "Innovation Start-up Pod",
    size: "Shared pod",
    location: "Curated",
    power: "Included",
    table: "1 (shared)",
    chairs: "1 (shared)",
    cost: "GHS 3,000 per company",
  },
];

const ROWS: { label: string; key: keyof Package }[] = [
  { label: "Size", key: "size" },
  { label: "Location", key: "location" },
  { label: "Electricity & power", key: "power" },
  { label: "Table", key: "table" },
  { label: "Chairs", key: "chairs" },
  { label: "Cost", key: "cost" },
];
*/

export default function PackageOptions() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".package-in", {
        y: 28,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: container.current, start: "top 75%", once: true },
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      aria-label="Registration fee"
      className="relative overflow-hidden px-6 py-20 md:px-16 md:py-28"
    >
      <div aria-hidden="true" className="absolute inset-0">
        <Image src="/materials/exhibition-bg.webp" alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-ink/75 backdrop-blur-[2px]" />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="package-in inline-flex rounded-full bg-forest/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-paper">
          Pricing
        </p>
        <h2 className="package-in mt-5 font-display text-[clamp(2rem,5vw,3.25rem)] font-extrabold uppercase tracking-tight text-paper">
          Registration Fee
        </h2>

        <div
          className="package-in mx-auto mt-8 max-w-2xl rounded-2xl border border-hairline/40 p-8 md:p-10"
          style={{
            backgroundColor: "color-mix(in srgb, var(--paper) 94%, transparent)",
          }}
        >
          <p className="text-base leading-relaxed text-ink md:text-lg">
            Exhibition space is provided free of charge.{" "}
            <span className="font-semibold text-gold-deep">A GHS 1,000 registration fee</span> secures
            your booking and confirms your participation.
          </p>
        </div>

        <div className="package-in mx-auto mt-8 max-w-2xl space-y-2 text-left text-sm text-paper/80">
          <p>
            Extras available on request at additional cost: extra furniture, custom branding,
            audio-visual equipment.
          </p>
          <p className="text-sm font-semibold leading-relaxed text-gold">
            Storage facilities are not provided. Stands should be kept tidy and free of clutter.
            Backstage access is limited.
          </p>
        </div>

        {/*
        <div className="package-in flex flex-col gap-4 md:hidden">
          {PACKAGES.map((p) => (
            ...
          ))}
        </div>

        <div className="package-in hidden overflow-x-auto rounded-xl border border-hairline md:block">
          <table>...</table>
        </div>
        */}

        <div
          className="package-in mx-auto mt-10 max-w-2xl rounded-xl border border-paper/15 p-6 text-left md:p-7"
          style={{ backgroundColor: "color-mix(in srgb, var(--paper) 8%, transparent)" }}
        >
          <h3 className="font-display text-sm font-bold uppercase tracking-tight text-gold">
            Eligibility
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-paper/85">
            Exhibiting is open to companies manufacturing across Africa, including producers of
            textiles, fabrics, accessories, and businesses involved in raw or semi-processed
            material production. Retail-only organisations are not eligible to exhibit but may
            advertise in the Trade Show Guide.
          </p>
        </div>
      </div>
    </section>
  );
}
