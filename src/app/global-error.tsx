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
          color: "#1A1A1A",
          fontFamily: "Archivo, Arial, Helvetica, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "3rem",
              height: "3rem",
              borderRadius: "9999px",
              background: "rgba(139, 58, 58, 0.1)",
              color: "#8B3A3A",
            }}
            aria-hidden="true"
          >
            ⚠
          </span>
          <h1
            style={{
              marginTop: "1rem",
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontSize: "1.125rem",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.9375rem", lineHeight: 1.6, color: "#015347", opacity: 0.85 }}>
            This page ran into an unexpected error. Try again, or contact support if it keeps happening.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1.25rem",
              display: "inline-flex",
              alignItems: "center",
              minHeight: "2.75rem",
              borderRadius: "9999px",
              border: "none",
              background: "#1A1A1A",
              color: "#F6F1E7",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#015347", opacity: 0.8 }}>
            Need help?{" "}
            <a href="mailto:enquiries@altfff.com" style={{ fontWeight: 600, color: "#B8860B" }}>
              enquiries@altfff.com
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
