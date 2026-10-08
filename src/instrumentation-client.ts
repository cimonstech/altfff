import * as Sentry from "@sentry/nextjs";
import { getSentryInitOptions } from "@/lib/sentryOptions";

Sentry.init({
  ...getSentryInitOptions(),
  // Client-only: capture admin dashboard + public form runtime errors.
  // No session replay widget - keep the footprint to error monitoring.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
