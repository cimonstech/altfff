"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { EVENT } from "@/lib/constants";

const SOCIALS = ["Instagram", "X / Twitter", "LinkedIn", "TikTok"];

export default function Footer() {
  const container = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !wordRef.current) return;
      // Slow parallax drift on the giant word as it enters.
      gsap.fromTo(
        wordRef.current,
        { y: 70 },
        {
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: container.current,
            start: "top bottom",
            end: "bottom bottom",
            scrub: 0.8,
          },
        },
      );
    },
    { scope: container },
  );

  return (
    <footer
      ref={container}
      id="contact"
      aria-label="Footer"
      className="overflow-hidden bg-paper"
    >
      <div className="px-6 pb-8 pt-20 md:px-16">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          {/* Newsletter — visual only for now */}
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase text-ink">
              Stay in the weave
            </h2>
            <p className="mt-2 max-w-[42ch] text-sm text-indigo">
              News on exhibitors, programming and tickets for {EVENT.dates}.
            </p>
            <form
              className="mt-6 flex max-w-md gap-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="you@studio.com"
                className="w-full rounded-full border border-hairline bg-surface px-5 py-3 text-sm text-ink placeholder:text-ink/40"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
              >
                Sign up
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-8 md:justify-items-end">
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.24em] text-gold-deep">
                Contact
              </h3>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-ink">
                <li>
                  <a href="mailto:hello@altfff.com" className="hover:opacity-60">
                    hello@altfff.com
                  </a>
                </li>
                <li>{EVENT.venue}</li>
                <li>{EVENT.city}</li>
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.24em] text-gold-deep">
                Follow
              </h3>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-ink">
                {SOCIALS.map((s) => (
                  <li key={s}>
                    <a href="#" className="hover:opacity-60">
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-16 max-w-6xl text-xs text-ink/50">
          © 2026 {EVENT.name}. All rights reserved.
        </p>
      </div>

      {/* Giant cropped wordmark — page bottom slices the letters */}
      <div
        className="overflow-hidden text-center"
        style={{ fontSize: "clamp(5rem, 18vw, 20rem)", height: "0.62em" }}
      >
        <div
          ref={wordRef}
          className="whitespace-nowrap font-display font-extrabold uppercase leading-none tracking-tight text-ink"
        >
          ALT.FFF
        </div>
      </div>
    </footer>
  );
}
