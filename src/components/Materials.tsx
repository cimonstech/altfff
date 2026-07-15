"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { MATERIALS } from "@/lib/constants";

export default function Materials() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".material-card", {
        y: 44,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: {
          trigger: container.current,
          start: "top 72%",
          once: true,
        },
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="materials"
      aria-label="The materials"
      className="bg-paper px-6 pb-24 md:px-16 md:pb-32"
    >
      <h2 className="mb-10 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase tracking-tight text-ink">
        The Materials
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MATERIALS.map((m) => (
          <article
            key={m.id}
            className="material-card group relative aspect-[4/5] overflow-hidden rounded-xl"
          >
            <Image
              src={m.background}
              alt={`${m.name} from ${m.origin}`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div
              className="absolute inset-x-0 bottom-0 p-5 pt-16"
              style={{
                background:
                  "linear-gradient(to top, color-mix(in srgb, var(--paper) 88%, transparent), transparent)",
              }}
            >
              <h3 className="font-display text-2xl font-extrabold uppercase leading-none text-ink">
                {m.name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-gold-deep">{m.origin}</p>
              <p className="mt-2 max-w-[36ch] text-sm text-indigo">{m.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
