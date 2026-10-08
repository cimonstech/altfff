import { EVENT } from "@/lib/constants";

type ScheduleKind = "launchCeremony" | "doorsOpen";

const PREFIX: Record<ScheduleKind, string> = {
  launchCeremony: "Launch ceremony:",
  doorsOpen: "Doors open:",
};

/** Renders a schedule label with the time bold and brown/gold. */
export default function EventScheduleLine({
  kind,
  className = "",
  variant = "light",
}: {
  kind: ScheduleKind;
  className?: string;
  /** Light surfaces use gold-deep; dark surfaces use gold for contrast. */
  variant?: "light" | "dark";
}) {
  const time = kind === "launchCeremony" ? EVENT.launchCeremonyTime : EVENT.doorsOpenTime;
  const timeClass = variant === "light" ? "font-bold text-gold-deep" : "font-bold text-gold";

  return (
    <p className={className}>
      {PREFIX[kind]}{" "}
      <span className={timeClass}>{time}</span>
    </p>
  );
}
