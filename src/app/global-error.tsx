"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * App Router root error boundary - required for React render errors to
 * reach Sentry. Must define its own <html>/<body> (Next.js constraint).
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F6F1E7",
          color: "#015347",
          fontFamily: "Archivo, Arial, Helvetica, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div>
          <p style={{ fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Something went wrong
          </p>
          <p style={{ marginTop: "0.75rem", opacity: 0.8 }}>
            Please refresh the page. If this keeps happening, email enquiries@altfff.com.
          </p>
        </div>
      </body>
    </html>
  );
}
