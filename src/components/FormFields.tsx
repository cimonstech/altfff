"use client";

import { useEffect, useRef, useState } from "react";
import { textWithBrandName } from "@/components/BrandName";
import { gsap } from "@/lib/gsap";

/** Underline-style labelled input: label floats up + shrinks on focus or
 * once filled, underline draws left-to-right on focus - all via GSAP
 * rather than CSS transitions, to match the site's motion language.
 * Reports its own filled/empty state up for a progress indicator, when the
 * caller has one. Shared between the exhibitor and visitor forms. */
export function FloatingField({
  id,
  name,
  label,
  required,
  type = "text",
  error,
  onFilledChange,
  onBlurValidate,
}: {
  id: string;
  /** Falls back to `id` when omitted. Only matters for forms that submit
   * as a real native POST (name is what the server/receiving endpoint
   * reads) rather than the visual-only forms elsewhere on the site. */
  name?: string;
  label: string;
  required?: boolean;
  type?: string;
  /** Zod / server field error shown under the input. */
  error?: string;
  onFilledChange?: (id: string, filled: boolean) => void;
  /** Called after blur with the field's form `name` (for shared Zod schemas). */
  onBlurValidate?: (fieldName: string) => void;
}) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(false);
  const fieldName = name ?? id;

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
        {textWithBrandName(label)}
        {required && <span className="text-madder"> *</span>}
      </span>
      <input
        id={id}
        name={fieldName}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlurValidate?.(fieldName);
        }}
        onChange={(e) => {
          const isFilled = e.target.value.length > 0;
          setFilled(isFilled);
          onFilledChange?.(id, isFilled);
        }}
        className="w-full border-0 border-b border-hairline bg-transparent px-0 pb-2 pt-1 text-base text-ink outline-none md:text-sm"
      />
      <span
        ref={underlineRef}
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gold"
        style={{ transform: "scaleX(0)" }}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-madder" role="alert">
          {error}
        </p>
      )}
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
  error,
  onFilledChange,
  onBlurValidate,
}: {
  id: string;
  name?: string;
  label: string;
  required?: boolean;
  rows?: number;
  error?: string;
  onFilledChange?: (id: string, filled: boolean) => void;
  onBlurValidate?: (fieldName: string) => void;
}) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(false);
  const fieldName = name ?? id;

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
        {textWithBrandName(label)}
        {required && <span className="text-madder"> *</span>}
      </span>
      <textarea
        id={id}
        name={fieldName}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlurValidate?.(fieldName);
        }}
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
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-madder" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Same underline/floating-label treatment, native <select>. */
export function FloatingSelect({
  id,
  name,
  label,
  options,
  error,
  onFilledChange,
  onBlurValidate,
}: {
  id: string;
  /** Falls back to `id` when omitted - see FloatingField's own `name` doc. */
  name?: string;
  label: string;
  options: { value: string; text: string }[];
  error?: string;
  onFilledChange?: (id: string, filled: boolean) => void;
  onBlurValidate?: (fieldName: string) => void;
}) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(false);
  const fieldName = name ?? id;

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
        {textWithBrandName(label)}
      </span>
      <select
        id={id}
        name={fieldName}
        defaultValue=""
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlurValidate?.(fieldName);
        }}
        onChange={(e) => {
          const isFilled = e.target.value.length > 0;
          setFilled(isFilled);
          onFilledChange?.(id, isFilled);
        }}
        className="w-full border-0 border-b border-hairline bg-transparent px-0 pb-2 pt-1 text-base text-ink outline-none md:text-sm"
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
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-madder" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}


