import * as Sentry from "@sentry/nextjs";
import { getSentryInitOptions } from "@/lib/sentryOptions";

Sentry.init(getSentryInitOptions());
