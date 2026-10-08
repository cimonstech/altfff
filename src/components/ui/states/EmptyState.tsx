import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

/** Genuinely zero data — no active filter/search. */
export default function EmptyState({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl border border-dashed border-hairline bg-surface px-6 py-10 text-center ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink/50">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-base font-extrabold uppercase tracking-tight text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-indigo">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
