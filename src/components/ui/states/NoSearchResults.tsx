import { SearchX } from "lucide-react";

type NoSearchResultsProps = {
  title?: string;
  description?: string;
  onClear: () => void;
  className?: string;
};

/** Data exists but the current filter/search matched nothing. */
export default function NoSearchResults({
  title = "No matching results",
  description = "Try adjusting your search or status filter to see more records.",
  onClear,
  className = "",
}: NoSearchResultsProps) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl border border-hairline bg-surface px-6 py-10 text-center ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold-deep">
        <SearchX className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-base font-extrabold uppercase tracking-tight text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-indigo">{description}</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-flex min-h-11 items-center rounded-full border border-hairline px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
      >
        Clear filters
      </button>
    </div>
  );
}
