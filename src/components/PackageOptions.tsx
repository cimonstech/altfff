"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

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
      aria-label="Package options"
      className="bg-paper px-6 py-20 md:px-16 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="package-in mb-10 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase tracking-tight text-ink">
          Package Options
        </h2>

        {/* Mobile: one card per package, label/value pairs stacked. Desktop
            (md+): the comparison table below, unchanged - a card layout at
            that width would lose the side-by-side compare that's the whole
            point of a pricing table. */}
        <div className="package-in flex flex-col gap-4 md:hidden">
          {PACKAGES.map((p) => (
            <div
              key={p.name}
              className={`rounded-xl border p-5 ${
                p.highlight ? "border-gold bg-gold/10" : "border-hairline"
              }`}
            >
              {p.highlight && (
                <span className="mb-2 inline-block rounded-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">
                  Recommended
                </span>
              )}
              <h3
                className={`font-display text-lg font-extrabold uppercase tracking-tight ${
                  p.highlight ? "text-gold-deep" : "text-ink"
                }`}
              >
                {p.name}
              </h3>
              <dl className="mt-3 flex flex-col gap-2">
                {ROWS.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 text-sm">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                      {row.label}
                    </dt>
                    <dd className={`text-right text-ink ${row.key === "cost" ? "font-semibold" : ""}`}>
                      {p[row.key]}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="package-in hidden overflow-x-auto rounded-xl border border-hairline md:block">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface">
                <th scope="col" className="w-40 p-4 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  &nbsp;
                </th>
                {PACKAGES.map((p) => (
                  <th
                    key={p.name}
                    scope="col"
                    className={`p-4 align-bottom font-display text-base font-extrabold uppercase tracking-tight ${
                      p.highlight ? "bg-gold/10 text-gold-deep" : "text-ink"
                    }`}
                  >
                    {p.highlight && (
                      <span className="mb-2 inline-block rounded-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">
                        Recommended
                      </span>
                    )}
                    <div>{p.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.label} className={i % 2 === 1 ? "bg-surface/50" : undefined}>
                  <th scope="row" className="p-4 text-xs font-semibold uppercase tracking-wide text-ink/50">
                    {row.label}
                  </th>
                  {PACKAGES.map((p) => (
                    <td
                      key={p.name}
                      className={`p-4 text-ink ${p.highlight ? "bg-gold/10 font-semibold" : ""} ${
                        row.key === "cost" ? "font-semibold" : ""
                      }`}
                    >
                      {p[row.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="package-in mt-8 flex flex-col gap-2 text-sm text-ink/70">
          <p>
            All packages include a listing in the official Alt.FFF Trade Show Guide and exhibitor
            promotion on Fashion Forum Africa platforms.
          </p>
          <p>
            Extras available on request at additional cost: extra furniture, custom branding,
            audio-visual equipment.
          </p>
          <p className="text-xs text-ink/50">
            Storage facilities are not provided. Stands should be kept tidy and free of clutter.
            Backstage access is limited.
          </p>
        </div>

        <div className="package-in mt-10 rounded-xl border border-hairline bg-surface p-6 md:p-7">
          <h3 className="font-display text-sm font-bold uppercase tracking-tight text-gold-deep">
            Eligibility
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink">
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


