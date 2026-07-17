"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

/** Underline-style labelled input: label floats up + shrinks on focus or
 * once filled, underline draws left-to-right on focus — all via GSAP
 * rather than CSS transitions, to match the site's motion language.
 * Reports its own filled/empty state up for a progress indicator, when the
 * caller has one. Shared between the exhibitor and visitor forms. */
export function FloatingField({
  id,
  name,
  label,
  required,
  type = "text",
  onFilledChange,
}: {
  id: string;
  /** Falls back to `id` when omitted. Only matters for forms that submit
   * as a real native POST (name is what the server/receiving endpoint
   * reads) rather than the visual-only forms elsewhere on the site. */
  name?: string;
  label: string;
  required?: boolean;
  type?: string;
  onFilledChange?: (id: string, filled: boolean) => void;
}) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const up = focused || filled;
    gsap.to(labelRef.current, {
      y: up ? -20 : 0,
      scale: up ? 0.78 : 1,
      color: focused ? "var(--gold-deep)" : "rgba(23,28,38,0.5)",
      duration: 0.25,
      ease: "power2.out",
      transformOrigin: "left top",
    });
  }, [focused, filled]);

  useEffect(() => {
    gsap.to(underlineRef.current, {
      scaleX: focused ? 1 : 0,
      duration: 0.35,
      ease: "power2.out",
    });
  }, [focused]);

  return (
    <div className="relative pt-5">
      <span
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-5 origin-left text-xs font-semibold uppercase tracking-wide text-ink/50"
      >
        {label}
        {required && <span className="text-madder"> *</span>}
      </span>
      <input
        id={id}
        name={name ?? id}
        type={type}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const isFilled = e.target.value.length > 0;
          setFilled(isFilled);
          onFilledChange?.(id, isFilled);
        }}
        className="w-full border-0 border-b border-hairline bg-transparent px-0 pb-2 pt-1 text-sm text-ink outline-none"
      />
      <span
        ref={underlineRef}
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gold"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}

/** Same underline/floating-label treatment, a <textarea> instead of a
 * single-line <input>. */
export function FloatingTextarea({
  id,
  name,
  label,
  required,
  rows = 4,
  onFilledChange,
}: {
  id: string;
  name?: string;
  label: string;
  required?: boolean;
  rows?: number;
  onFilledChange?: (id: string, filled: boolean) => void;
}) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const up = focused || filled;
    gsap.to(labelRef.current, {
      y: up ? -20 : 0,
      scale: up ? 0.78 : 1,
      color: focused ? "var(--gold-deep)" : "rgba(23,28,38,0.5)",
      duration: 0.25,
      ease: "power2.out",
      transformOrigin: "left top",
    });
  }, [focused, filled]);

  useEffect(() => {
    gsap.to(underlineRef.current, {
      scaleX: focused ? 1 : 0,
      duration: 0.35,
      ease: "power2.out",
    });
  }, [focused]);

  return (
    <div className="relative pt-5">
      <span
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-5 origin-left text-xs font-semibold uppercase tracking-wide text-ink/50"
      >
        {label}
        {required && <span className="text-madder"> *</span>}
      </span>
      <textarea
        id={id}
        name={name ?? id}
        required={required}
        rows={rows}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const isFilled = e.target.value.length > 0;
          setFilled(isFilled);
          onFilledChange?.(id, isFilled);
        }}
        className="w-full resize-none border-0 border-b border-hairline bg-transparent px-0 pb-2 pt-1 text-sm text-ink outline-none"
      />
      <span
        ref={underlineRef}
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gold"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}

/** Same underline/floating-label treatment, native <select>. */
export function FloatingSelect({
  id,
  label,
  options,
  onFilledChange,
}: {
  id: string;
  label: string;
  options: { value: string; text: string }[];
  onFilledChange?: (id: string, filled: boolean) => void;
}) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const up = focused || filled;
    gsap.to(labelRef.current, {
      y: up ? -20 : 0,
      scale: up ? 0.78 : 1,
      color: focused ? "var(--gold-deep)" : "rgba(23,28,38,0.5)",
      duration: 0.25,
      ease: "power2.out",
      transformOrigin: "left top",
    });
  }, [focused, filled]);

  useEffect(() => {
    gsap.to(underlineRef.current, {
      scaleX: focused ? 1 : 0,
      duration: 0.35,
      ease: "power2.out",
    });
  }, [focused]);

  return (
    <div className="relative pt-5">
      <span
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-5 origin-left text-xs font-semibold uppercase tracking-wide text-ink/50"
      >
        {label}
      </span>
      <select
        id={id}
        defaultValue=""
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const isFilled = e.target.value.length > 0;
          setFilled(isFilled);
          onFilledChange?.(id, isFilled);
        }}
        className="w-full border-0 border-b border-hairline bg-transparent px-0 pb-2 pt-1 text-sm text-ink outline-none"
      >
        <option value="" disabled hidden />
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.text}
          </option>
        ))}
      </select>
      <span
        ref={underlineRef}
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gold"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
