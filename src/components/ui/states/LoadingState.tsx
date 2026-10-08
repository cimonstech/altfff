type LoadingStateProps = {
  label?: string;
  className?: string;
};

/** Centered spinner for short action-triggered waits. */
export default function LoadingState({ label = "Loading…", className = "" }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`} role="status" aria-live="polite">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-gold"
        aria-hidden="true"
      />
      <p className="text-sm text-indigo">{label}</p>
    </div>
  );
}
