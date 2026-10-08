"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { EXHIBITOR_2026_TERMS } from "@/lib/constants";
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
      aria-label="Exhibitor pricing"
      className="relative overflow-hidden px-6 py-20 md:px-16 md:py-28"
    >
      <div aria-hidden="true" className="absolute inset-0">
        <Image src="/materials/exhibition-bg.webp" alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-ink/75 backdrop-blur-[2px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* 2026 fair — confirmed registration terms */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="package-in inline-flex rounded-full bg-gold/25 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-paper">
            Alt.FFF 2026
          </p>
          <h2 className="package-in mt-5 font-display text-[clamp(2rem,5vw,3.25rem)] font-extrabold uppercase tracking-tight text-paper">
            Registration Fee
          </h2>
          <p className="package-in mt-3 text-sm font-medium text-paper/70">
            Confirmed terms for the 2026 fair
          </p>

          <div
            className="package-in mx-auto mt-8 max-w-2xl rounded-2xl border-2 border-gold/40 p-8 text-left md:p-10"
            style={{
              backgroundColor: "color-mix(in srgb, var(--paper) 94%, transparent)",
            }}
          >
            <p className="text-base leading-relaxed text-ink md:text-lg">{EXHIBITOR_2026_TERMS}</p>
          </div>
        </div>

        {/*
        2027 indicative tiered pricing — preserved for future use, not shown publicly.

        <div className="package-in mx-auto mt-16 max-w-6xl rounded-2xl border border-paper/20 bg-paper p-6 md:mt-20 md:p-10">
          <h2 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold uppercase tracking-tight text-ink">
            Package Options (2027)
          </h2>
          <p className="mt-2 text-sm text-ink/60">
            Indicative tiered pricing for future reference — not applicable to the 2026 fair above.
          </p>

          <div className="mt-8 flex flex-col gap-4 md:hidden">
            {PACKAGES.map((p) => (
              ...
            ))}
          </div>

          <div className="mt-8 hidden overflow-x-auto rounded-xl border border-hairline md:block">
            <table>...</table>
          </div>

          <div className="mt-8 flex flex-col gap-2 text-sm text-ink/70">
            <p>
              Please note that the rates shown are indicative for the 2027 event and may be revised
              prior to confirmation of booking.
            </p>
            <p>
              All packages include a listing in the official Alt.FFF Trade Show Guide and exhibitor
              promotion on Fashion Forum Africa platforms.
            </p>
          </div>
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
            advertise in the{" "}
            <Link href="/trade-show-guide" className="underline decoration-gold underline-offset-4 hover:opacity-80">
              Trade Show Guide
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
