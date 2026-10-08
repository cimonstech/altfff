"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/states/ErrorState";

/**
 * App Router segment error boundary — catches render errors in page/layout
 * trees below the root and shows a friendly fallback instead of a raw crash.
 * (global-error.tsx handles root-layout failures separately.)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center bg-paper px-6 py-20">
      <ErrorState onRetry={() => reset()} className="max-w-md" />
    </main>
  );
}
