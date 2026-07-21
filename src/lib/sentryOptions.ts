/**
 * Shared Sentry init options for client / server / edge. DSN comes from
 * NEXT_PUBLIC_SENTRY_DSN only - never hardcode a project DSN here.
 *
 * Reporting is off in development by default so local hot-reload noise and
 * known localhost limitations (QStash can't reach SITE_URL=localhost) do not
 * drown the Sentry project. Set SENTRY_ENABLE_DEV=true (server) and/or
 * NEXT_PUBLIC_SENTRY_ENABLE_DEV=true (browser) to force-on for a deliberate
 * verify session against a real DSN.
 */
export function getSentryInitOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const enableDev =
    process.env.SENTRY_ENABLE_DEV === "true" ||
    process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV === "true";
  const enabled =
    Boolean(dsn) && (process.env.NODE_ENV === "production" || enableDev);

  return {
    dsn,
    enabled,
    environment: process.env.NODE_ENV,
    // Errors matter; traces are sampled lightly in prod to control volume.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Avoid shipping request bodies / PII by default from form routes.
    sendDefaultPii: false,
  };
}
