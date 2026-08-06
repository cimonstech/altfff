"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { EVENT } from "@/lib/constants";
import { useSiteModals } from "@/components/SiteModals";

const SCHEDULE = [
  {
    label: "Exhibitor set-up",
    date: EVENT.setupDateLabel,
    detail: "Exhibitors prepare their stands ahead of the public fair. Not open to visitors.",
  },
  {
    label: "The Fair",
    date: EVENT.tradeFairDateLabel,
    detail:
      "One-day trade fair — fibres, dyes, weaves, makers, buyers, and the full Alt.FFF programme. The launch is incorporated into the opening of the day.",
    hours: "10:00 – 18:00",
  },
];

export default function EventDetails() {
  const container = useRef<HTMLElement>(null);
  const { openExhibitModal } = useSiteModals();

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".day-card", {
        y: 32,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: {
          trigger: container.current,
          start: "top 70%",
          once: true,
        },
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="visit"
      aria-label="Event details"
      className="relative overflow-x-hidden bg-ink px-6 py-24 text-paper md:px-16 md:py-32"
      style={{
        backgroundImage:
          "linear-gradient(0deg, rgba(1, 83, 71, 0.78), rgba(1, 83, 71, 0.78)), url('/materials/exhibition-bg.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Fabric strip, straddling the seam where the section above
          transitions into this one: top-0 places its top edge at the
          section's own top edge (the seam), then -translate-y-1/2 shifts
          it up by half its own height so that edge becomes its vertical
          CENTER instead - half the strip bleeds up into whatever precedes
          this section, half hangs down into this one. Requires the
          section itself to only clip horizontally (overflow-x-hidden,
          not overflow-hidden) so this element isn't clipped at the
          section's top edge before it can bleed upward. Single next/image
          `fill` layer (no CSS background-repeat involved), clipped to a
          clean crop by this div's own overflow-hidden. Inserted as the
          section's first child so it paints above the section's own CSS
          background but below the heading/day-cards content that follows
          in DOM order; pointer events are disabled so it can never
          intercept clicks/taps meant for the content beneath it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[100px] -translate-y-1/2 overflow-hidden md:h-[140px]"
      >
        <Image
          src="/materials/fabrics2.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-top"
        />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <h2 className="mb-12 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase tracking-tight">
          Set-up &amp; Fair Day
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          {SCHEDULE.map((item) => (
            <div
              key={item.label}
              className="day-card rounded-xl border border-paper/15 bg-paper/5 p-7"
            >
              <p className="font-display text-3xl font-extrabold uppercase">{item.label}</p>
              <p className="mt-3 text-paper/85">{item.date}</p>
              {item.hours ? (
                <p className="mt-1 text-sm text-paper/60">{item.hours}</p>
              ) : null}
              <p className="mt-4 text-sm leading-relaxed text-paper/75">{item.detail}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-paper/85">{EVENT.venue}</p>

        <div className="mt-8 flex flex-wrap gap-4">
          {/* Information-seeking CTA - takes the visitor to the full Visit
              page (details + the Register to visit modal trigger) rather
              than popping a form immediately. */}
          <Link
            href="/visit"
            className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-ink transition-opacity hover:opacity-85"
          >
            Plan your visit
          </Link>
          <button
            type="button"
            onClick={openExhibitModal}
            className="inline-flex items-center gap-2 rounded-full border border-paper px-7 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-paper hover:text-indigo"
          >
            Exhibit with us
          </button>
        </div>
      </div>
    </section>
  );
}
