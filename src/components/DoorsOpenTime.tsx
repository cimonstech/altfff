import { Clock } from "lucide-react";
import { EVENT } from "@/lib/constants";

/** Doors-open time with clock icon — time only, no "Doors open:" label. */
export default function DoorsOpenTime({
  className = "",
  variant = "light",
  size = "md",
}: {
  className?: string;
  variant?: "light" | "dark";
  /** `lg` is 50% larger than the default — used on the mobile homepage hero. */
  size?: "md" | "lg";
}) {
  const timeColor = variant === "light" ? "text-gold-deep" : "text-gold";
  const iconClass = size === "lg" ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0";
  const timeClass = size === "lg" ? "text-[1.3125rem] leading-none" : "text-sm leading-none";

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Clock className={`${iconClass} ${timeColor}`} aria-hidden="true" />
      <span className={`${timeClass} font-bold ${timeColor}`}>{EVENT.doorsOpenTime}</span>
      <span className="sr-only">Doors open {EVENT.doorsOpenTime}</span>
    </span>
  );
}
