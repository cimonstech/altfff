"use client";

import { useEffect, useRef, useState } from "react";
import RPNInput, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { gsap } from "@/lib/gsap";

/**
 * International phone input - wraps react-phone-number-input (flag dropdown
 * + number field) with the site's own underline/floating-label treatment so
 * it reads as part of the form, not a third-party widget dropped in. See
 * globals.css's `.alt-phone-input*` rules for the actual visual overrides
 * (the library's own stylesheet is imported above and then substantially
 * repainted there, same approach as `.rich-text` for Tiptap output).
 *
 * Always submits a clean E.164 string (e.g. +233241234567) via a hidden
 * input - that's what src/lib/sms.ts's `+`-prefix branch expects, and it's
 * what every form on this site reads via `new FormData(form)`, not
 * whatever partially-typed text happens to be visible mid-entry.
 */
export function PhoneInput({
  id,
  name,
  label,
  required,
  defaultCountry = "GH",
  onFilledChange,
}: {
  id: string;
  /** Falls back to `id`, same convention as FloatingField. */
  name?: string;
  label: string;
  required?: boolean;
  /** ISO 3166-1 alpha-2 country code to preselect. */
  defaultCountry?: Country;
  onFilledChange?: (id: string, filled: boolean) => void;
}) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState<string | undefined>(undefined);

  const filled = !!value;

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
        className="pointer-events-none absolute left-0 top-5 z-10 origin-left text-xs font-semibold uppercase tracking-wide text-ink/50"
      >
        {label}
        {required && <span className="text-madder"> *</span>}
      </span>
      <RPNInput
        id={id}
        className="alt-phone-input"
        international
        defaultCountry={defaultCountry}
        value={value}
        onChange={(v) => {
          setValue(v);
          onFilledChange?.(id, !!v);
        }}
        numberInputProps={{
          className: "alt-phone-input__number",
          onFocus: () => setFocused(true),
          onBlur: () => setFocused(false),
        }}
        countrySelectProps={{ className: "alt-phone-input__country" }}
      />
      {/* The library's own inputs aren't named for native FormData
          serialization - this hidden mirror is the field every form's
          `new FormData(e.currentTarget)` actually reads, always the clean
          E.164 value (or "" if empty/invalid), never the visible partial text. */}
      <input type="hidden" name={name ?? id} value={value ?? ""} />
      <span
        ref={underlineRef}
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gold"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
