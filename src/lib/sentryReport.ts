import * as Sentry from "@sentry/nextjs";

/**
 * SERVER-ONLY helpers for reporting unexpected failures with route context
 * and without form PII (no emails, phones, message bodies, or recipient lists).
 *
 * Deliberately NOT used for: honeypot/bot-signal warnings, validation 400s,
 * rate-limit 429s, or the rate-limit "env not configured" fail-open path.
 */
export function reportServerError(
  error: unknown,
  context: {
    route: string;
    kind:
      | "db"
      | "email"
      | "sms"
      | "queue"
      | "redis"
      | "admin"
      | "worker"
      | "storage"
      | "config";
    extra?: Record<string, string | number | boolean | null | undefined>;
  },
): void {
  Sentry.withScope((scope) => {
    scope.setTag("route", context.route);
    scope.setTag("error_kind", context.kind);
    if (context.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        if (value !== undefined) scope.setExtra(key, value);
      }
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
      return;
    }

    // Supabase / Resend often return plain objects rather than Error.
    const message =
      error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : typeof error === "string"
          ? error
          : "Unknown server error";

    Sentry.captureException(new Error(message), {
      extra: { original: safeErrorShape(error) },
    });
  });
}

function safeErrorShape(error: unknown): unknown {
  if (!error || typeof error !== "object") return error;
  const record = error as Record<string, unknown>;
  return {
    message: typeof record.message === "string" ? record.message : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
    name: typeof record.name === "string" ? record.name : undefined,
    statusCode: typeof record.statusCode === "number" ? record.statusCode : undefined,
  };
}
