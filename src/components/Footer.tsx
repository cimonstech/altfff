"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { EVENT } from "@/lib/constants";

const SOCIALS = ["Instagram", "X / Twitter", "LinkedIn", "TikTok"];
const WORDMARK = "ALT.FFF";
const PROXIMITY_RADIUS = 140; // px, cursor influence falls off to 0 past this
const MAX_LIFT = 10; // px
const MAX_SCALE = 0.08; // +8% at the cursor's exact position

export default function Footer() {
  const container = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);

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

  // Cursor-proximity "magnetic" distortion on the giant wordmark: letters
  // nearest the cursor lift and scale up very slightly. Skipped under
  // reduced motion and on touch devices (no persistent cursor position).
  useEffect(() => {
    const footer = container.current;
    if (!footer) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const letters = letterRefs.current.filter((el): el is HTMLSpanElement => el !== null);
    // Driving quickTo off a plain proxy object (not the DOM element) and
    // composing the transform string by hand in onUpdate, rather than
    // quickTo-ing "y"/"scale" on the element directly: combining a
    // translate-family and a scale-family quickTo on the same element
    // trips GSAP's independent-CSS-transform-property detection (it
    // collides with Tailwind's preflight, which sets those properties to
    // "none" on every element) and silently drops one of the two tweens.
    const setters = letters.map((el) => {
      const proxy = { y: 0, scale: 1 };
      const apply = () => {
        el.style.transform = `translate(0, ${proxy.y.toFixed(2)}px) scale(${proxy.scale.toFixed(3)})`;
      };
      return {
        y: gsap.quickTo(proxy, "y", { duration: 0.4, ease: "power3", onUpdate: apply }),
        scale: gsap.quickTo(proxy, "scale", { duration: 0.4, ease: "power3", onUpdate: apply }),
      };
    });

    const onMove = (e: PointerEvent) => {
      letters.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        const influence = Math.max(0, 1 - dist / PROXIMITY_RADIUS);
        setters[i].y(-MAX_LIFT * influence);
        setters[i].scale(1 + MAX_SCALE * influence);
      });
    };
    const onLeave = () => {
      setters.forEach((s) => {
        s.y(0);
        s.scale(1);
      });
    };

    footer.addEventListener("pointermove", onMove);
    footer.addEventListener("pointerleave", onLeave);
    return () => {
      footer.removeEventListener("pointermove", onMove);
      footer.removeEventListener("pointerleave", onLeave);
    };
  }, []);

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
          {WORDMARK.split("").map((ch, i) => (
            <span
              key={i}
              ref={(el) => {
                letterRefs.current[i] = el;
              }}
              className="inline-block"
            >
              {ch}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
