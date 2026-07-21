import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimitMessages";
import { reportServerError } from "@/lib/sentryReport";

export { RATE_LIMIT_ERROR_MESSAGE };

/**
 * Public form rate limits. Easy to retune without hunting magic numbers:
 * 5 attempts / 10 minutes is loose enough for a human fixing validation
 * errors, tight enough to stop a script hammering an endpoint.
 */
export const RATE_LIMIT_MAX_REQUESTS = 5;
export const RATE_LIMIT_WINDOW = "10 m" as const;
export type PublicFormRoute =
  | "contact"
  | "exhibitor-applications"
  | "sponsor-inquiries"
  | "visitor-registrations";

/**
 * Lazy construction — same build-safety pattern as qstash/r2/supabase
 * admin clients. A missing env var must not throw during Next's build-time
 * page-data collection.
 *
 * FAIL OPEN (deliberate): if Redis env vars are missing, or the Redis/
 * Ratelimit call itself throws, we log a warning and allow the request.
 * Blocking real form submissions over a rate-limiter outage or incomplete
 * local env would be worse than briefly going unprotected — tonight's
 * pattern of hard failures taught that lesson. Rate limiting is a
 * safety net, not a hard dependency of the submit path.
 */
let cachedLimiter: Ratelimit | null = null;
let missingEnvWarned = false;

function getLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!missingEnvWarned) {
      missingEnvWarned = true;
      console.warn(
        "[rateLimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled (fail open).",
      );
    }
    return null;
  }

  if (!cachedLimiter) {
    cachedLimiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW),
      prefix: "altfff:form",
      analytics: false,
    });
  }
  return cachedLimiter;
}

/** First address in x-forwarded-for, or a stable fallback — never throws. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Per-route, per-IP check. Returns `{ success: true }` when allowed (or
 * when failing open). Returns `{ success: false }` only when Redis
 * confirms the window is exceeded.
 */
export async function checkPublicFormRateLimit(
  request: Request,
  route: PublicFormRoute,
): Promise<{ success: boolean }> {
  const limiter = getLimiter();
  if (!limiter) return { success: true };

  const ip = getClientIp(request);
  // Route prefix keeps exhibitor attempts from counting against visitor, etc.
  const identifier = `${route}:${ip}`;

  try {
    const result = await limiter.limit(identifier);
    return { success: result.success };
  } catch (err) {
    // Genuine Redis/network failure after env was present - fail open for
    // the user, but report so we know the safety net is down. The "env not
    // configured" path above stays console-only (working as designed).
    console.warn("[rateLimit] Redis/Ratelimit call failed — allowing request (fail open):", err);
    reportServerError(err, {
      route: `rateLimit:${route}`,
      kind: "redis",
      extra: { failOpen: true },
    });
    return { success: true };
  }
}
