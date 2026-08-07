import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  supportEmail?: string;
  compact?: boolean;
  className?: string;
  children?: ReactNode;
};

/** Shared error fallback — full-page boundaries and inline load failures. */
export default function ErrorState({
  title = "Something went wrong",
  description = "This page ran into an unexpected error. Try again, or contact support if it keeps happening.",
  onRetry,
  retryLabel = "Try again",
  supportEmail = "enquiries@altfff.com",
  compact = false,
  className = "",
  children,
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? "px-4 py-6" : "px-6 py-10"} ${className}`}
      role="alert"
    >
      <span
        className={`flex items-center justify-center rounded-full bg-madder/10 text-madder ${compact ? "h-10 w-10" : "h-12 w-12"}`}
      >
        <AlertTriangle className={compact ? "h-5 w-5" : "h-6 w-6"} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h2
        className={`mt-4 font-display font-extrabold uppercase tracking-tight text-ink ${compact ? "text-sm" : "text-base md:text-lg"}`}
      >
        {title}
      </h2>
      <p className={`mt-2 max-w-md leading-relaxed text-indigo ${compact ? "text-sm" : "text-sm md:text-base"}`}>
        {description}
      </p>
      {children}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
        >
          {retryLabel}
        </button>
      )}
      <p className={`text-indigo/80 ${compact ? "mt-3 text-xs" : "mt-4 text-sm"}`}>
        Need help?{" "}
        <a href={`mailto:${supportEmail}`} className="font-semibold text-gold-deep underline-offset-2 hover:underline">
          {supportEmail}
        </a>
      </p>
    </div>
  );
}
