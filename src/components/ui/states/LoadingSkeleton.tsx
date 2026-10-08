type LoadingSkeletonProps = {
  variant?: "table" | "cards" | "overview";
  className?: string;
};

function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-ink/10 ${className}`} aria-hidden="true" />;
}

/** Content-shaped placeholders for route-level loading boundaries. */
export default function LoadingSkeleton({ variant = "table", className = "" }: LoadingSkeletonProps) {
  if (variant === "overview") {
    return (
      <div className={`grid gap-4 sm:grid-cols-2 ${className}`} aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-hairline bg-surface p-5">
            <Bone className="h-4 w-24" />
            <Bone className="mt-4 h-8 w-16" />
            <Bone className="mt-4 h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={`flex flex-col gap-3 ${className}`} aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-hairline bg-surface p-4">
            <Bone className="h-4 w-2/3" />
            <Bone className="mt-3 h-3 w-1/3" />
            <Bone className="mt-3 h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-md border border-hairline ${className}`} aria-hidden="true">
      <div className="space-y-0 bg-surface p-3">
        <Bone className="mb-3 h-4 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Bone key={i} className="mb-2 h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
