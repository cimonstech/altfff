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

  // Card lift on hover: a subtle whole-card scale via GSAP, paired with a
  // CSS-transitioned shadow + border brighten (kept modest on all three so
  // it reads as a deliberate lift, not a busy hover state).
  const handleEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion()) return;
    gsap.to(e.currentTarget, { scale: 1.04, duration: 0.3, ease: "power2.out" });
  };
  const handleLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion()) return;
    gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: "power2.out" });
  };

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
            className="material-card relative aspect-[4/5] overflow-hidden rounded-xl border border-hairline transition-[box-shadow,border-color] duration-300 hover:border-gold/45 hover:shadow-[0_22px_44px_rgba(23,28,38,0.28)]"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <Image
              src={m.background}
              alt={`${m.name} from ${m.origin}`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
            {/* Bottom scrim: dark gradient sized independently of the text
                content (58% of the card's own height, not the text block's),
                so the name/origin always sit on a reliable dark backing
                regardless of what the photo looks like underneath. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%]"
              style={{
                background:
                  "linear-gradient(to top, color-mix(in srgb, var(--ink) 88%, transparent), transparent)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h3 className="font-display text-2xl font-extrabold uppercase leading-none text-paper">
                {m.name}
              </h3>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
                {m.origin}
              </p>
              <p className="mt-2 max-w-[36ch] text-sm text-paper/75">{m.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
