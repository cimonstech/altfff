type InlineErrorMessageProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

/** Row-level / action-level failure without a full page crash. */
export default function InlineErrorMessage({
  message,
  onRetry,
  retryLabel = "Try again",
  className = "",
}: InlineErrorMessageProps) {
  return (
    <div className={`rounded-md border border-madder/30 bg-madder/5 px-3 py-2 text-sm text-madder ${className}`} role="alert">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-xs font-semibold uppercase tracking-wide underline-offset-2 hover:underline"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
