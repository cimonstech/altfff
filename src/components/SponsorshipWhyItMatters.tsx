"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const STATS = [
  { value: 3, suffix: "", label: "Days" },
  { value: 100, suffix: "+", label: "Manufacturers" },
  { value: 54, suffix: "", label: "Countries" },
  { value: 2000, suffix: "+", label: "Buyers" },
];

export default function SponsorshipWhyItMatters() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const numbers = container.current?.querySelectorAll<HTMLElement>("[data-count]");
      if (!numbers) return;

      if (prefersReducedMotion()) {
        numbers.forEach((el) => {
          el.textContent = Number(el.dataset.count).toLocaleString("en-US");
        });
        return;
      }

      gsap.from(".why-in", {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: container.current, start: "top 75%", once: true },
      });

      numbers.forEach((el) => {
        const target = Number(el.dataset.count);
        const state = { n: 0 };
        gsap.to(state, {
          n: target,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: container.current, start: "top 70%", once: true },
          onUpdate: () => {
            el.textContent = Math.round(state.n).toLocaleString("en-US");
          },
        });
      });
    },
    { scope: container },
  );

  return (
    <section ref={container} aria-label="Why it matters" className="bg-paper px-6 py-20 md:px-16 md:py-28">
      <div className="mx-auto max-w-5xl">
        <p className="why-in text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-deep">
          Why It Matters
        </p>
        <p className="why-in mt-4 max-w-[65ch] text-lg leading-relaxed text-ink md:text-xl">
          Alt.FFF is designed to bridge creativity with commerce and ensure
          Africa&apos;s fashion future is recognised, protected, and
          celebrated worldwide.
        </p>

        <dl className="why-in mt-14 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <dd className="font-display text-[clamp(2.5rem,6vw,4rem)] font-extrabold leading-none text-gold">
                <span data-count={s.value}>0</span>
                {s.suffix}
              </dd>
              <dt className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}


