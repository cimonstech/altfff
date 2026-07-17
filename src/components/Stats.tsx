"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import AfricaMap from "@/components/AfricaMap";
import AmbientAtmosphere from "@/components/AmbientAtmosphere";

const STATS = [
  { value: 54, suffix: "", label: "Countries represented" },
  { value: 100, suffix: "+", label: "Manufacturers on the floor" },
  { value: 2000, suffix: "+", label: "Buyers expected" },
];

export default function Stats() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const numbers =
        container.current?.querySelectorAll<HTMLElement>("[data-count]");
      if (!numbers) return;

      if (prefersReducedMotion()) {
        numbers.forEach((el) => {
          el.textContent = Number(el.dataset.count).toLocaleString("en-US");
        });
        return;
      }

      // Counters run exactly once when the section scrolls into view.
      numbers.forEach((el) => {
        const target = Number(el.dataset.count);
        const state = { n: 0 };
        gsap.to(state, {
          n: target,
          duration: 1.8,
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
    <section
      ref={container}
      aria-label="The fair in numbers"
      className="relative bg-paper px-6 py-24 md:px-16 md:py-32"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-2">
        <AfricaMap className="mx-auto w-full max-w-lg" />

        <dl className="flex flex-col gap-12">
          {STATS.map((s) => (
            <div key={s.label}>
              <dd className="font-display text-[clamp(3.5rem,8vw,6.5rem)] font-extrabold leading-none text-ink">
                <span data-count={s.value}>0</span>
                {s.suffix && <span className="text-gold">{s.suffix}</span>}
              </dd>
              <dt className="mt-2 text-sm uppercase tracking-[0.18em] text-indigo">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>

      <AmbientAtmosphere containerRef={container} />
    </section>
  );
}


