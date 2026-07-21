import { NextResponse } from "next/server";
import { reportServerError } from "@/lib/sentryReport";

export const runtime = "nodejs";

/**
 * Deliberate Sentry verify endpoint. Returns 404 unless SENTRY_ENABLE_DEV=true
 * so it can never be hit accidentally in production. With a real
 * NEXT_PUBLIC_SENTRY_DSN + SENTRY_ENABLE_DEV=true, GET this route and confirm
 * the event appears in the Sentry Issues feed with route=/api/sentry-test.
 */
export async function GET() {
  if (process.env.SENTRY_ENABLE_DEV !== "true") {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  reportServerError(new Error("Sentry deliberate test error (safe to ignore)"), {
    route: "/api/sentry-test",
    kind: "admin",
    extra: { deliberate: true },
  });

  return NextResponse.json({
    ok: true,
    message: "Test error reported to Sentry (if DSN + enable-dev are set).",
  });
}
