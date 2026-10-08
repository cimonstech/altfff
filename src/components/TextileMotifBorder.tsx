import { useId } from "react";

/**
 * Decorative geometric accent strip for the textile detail panel - an
 * original, abstract triangle/chevron band in the kente palette (gold,
 * madder, forest). Deliberately NOT a reproduction of any named adinkra or
 * other cultural symbol, since no verified source assets were provided for
 * one; this is an invented geometric pattern only, functioning as a plain
 * decorative frame.
 *
 * Isolated in its own component specifically so a real, sourced symbol or
 * pattern asset can replace the pattern below later without touching
 * whatever panel renders it - swap the <pattern> contents (or this whole
 * component) and nothing else needs to change.
 */
export default function TextileMotifBorder({ className = "" }: { className?: string }) {
  const patternId = useId();

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 84 14"
      preserveAspectRatio="none"
      className={`block h-3.5 w-full ${className}`}
    >
      <defs>
        <pattern id={patternId} width="42" height="14" patternUnits="userSpaceOnUse">
          <polygon points="0,14 7,0 14,14" fill="var(--gold)" />
          <polygon points="14,14 21,0 28,14" fill="var(--madder)" />
          <polygon points="28,14 35,0 42,14" fill="var(--forest)" />
        </pattern>
      </defs>
      <rect width="84" height="14" fill={`url(#${patternId})`} />
    </svg>
  );
}


