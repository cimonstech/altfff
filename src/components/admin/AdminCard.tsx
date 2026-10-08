import type { ReactNode } from "react";
import Link from "next/link";

export type AdminCardAccent = "gold" | "forest" | "madder" | "indigo" | "none";

const ACCENT_TOP: Record<Exclude<AdminCardAccent, "none">, string> = {
  gold: "border-t-gold",
  forest: "border-t-forest",
  madder: "border-t-madder",
  indigo: "border-t-indigo",
};

/**
 * Shared admin surface: consistent radius, padding, border, and optional
 * top accent. Use for Overview entity cards and other dashboard panels so
 * styling doesn't drift across separately-built admin pages.
 */
export default function AdminCard({
  children,
  className = "",
  accent = "none",
  href,
  onClick,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  accent?: AdminCardAccent;
  /** When set, the card is a navigation link (whole surface clickable). */
  href?: string;
  /** When set, the card opens an action (e.g. detail modal). Mutually exclusive with href. */
  onClick?: () => void;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const pad =
    padding === "none" ? "p-0" : padding === "sm" ? "p-3" : padding === "lg" ? "p-6" : "p-5";
  const accentClass = accent === "none" ? "" : `border-t-4 ${ACCENT_TOP[accent]}`;
  const interactiveClass =
    href || onClick
      ? "block w-full text-left transition-colors hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      : "";
  const classes = [
    "rounded-md border border-hairline bg-surface",
    pad,
    accentClass,
    interactiveClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}
