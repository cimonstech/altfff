"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { EVENT } from "@/lib/constants";
import { useSiteModals } from "@/components/SiteModals";

const DAYS = [
  { day: "Day 1", date: "Wed, September 17", hours: "10:00 – 18:00 (placeholder)" },
  { day: "Day 2", date: "Thu, September 18", hours: "10:00 – 18:00 (placeholder)" },
  { day: "Day 3", date: "Fri, September 19", hours: "10:00 – 16:00 (placeholder)" },
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
      className="bg-indigo px-6 py-24 text-paper md:px-16 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase tracking-tight">
          Three Days in Accra
        </h2>

        <div className="grid gap-5 md:grid-cols-3">
          {DAYS.map((d) => (
            <div
              key={d.day}
              className="day-card rounded-xl border border-paper/15 bg-paper/5 p-7"
            >
              <p className="font-display text-3xl font-extrabold uppercase">{d.day}</p>
              <p className="mt-3 text-paper/85">{d.date}</p>
              <p className="mt-1 text-sm text-paper/60">{d.hours}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-paper/85">
          {EVENT.venue}, {EVENT.city}
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          {/* Information-seeking CTA — takes the visitor to the full Visit
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
