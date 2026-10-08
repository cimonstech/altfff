import { Fragment, type ReactNode } from "react";
import { EVENT } from "@/lib/constants";

export const BRAND_NAME = EVENT.name;

const BRAND_REGEX = /Alt\.FFF/gi;

/** Preserves Alt.FFF casing inside uppercase parents (`text-transform: none`). */
export function BrandName({ className }: { className?: string }) {
  return (
    <span className={className ? `normal-case ${className}` : "normal-case"}>
      {BRAND_NAME}
    </span>
  );
}

/** Splits a string on Alt.FFF (any casing) and wraps each match in BrandName. */
export function textWithBrandName(text: string): ReactNode {
  if (!BRAND_REGEX.test(text)) return text;

  BRAND_REGEX.lastIndex = 0;
  const parts = text.split(BRAND_REGEX);
  const matches = text.match(BRAND_REGEX) ?? [];

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < matches.length ? <BrandName /> : null}
        </Fragment>
      ))}
    </>
  );
}
