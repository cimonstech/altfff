import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimitMessages";
import { reportServerError } from "@/lib/sentryReport";

export { RATE_LIMIT_ERROR_MESSAGE };

/**
 * Public form rate limits. Easy to retune without hunting magic numbers:
 * 5 attempts / 10 minutes is loose enough for a human fixing validation
 * errors, tight enough to stop a script hammering an endpoint.
 *
 * Walk-in uses a higher per-IP ceiling — venue WiFi often shares one public
 * IP across a cluster registering at the door.
 */
export const RATE_LIMIT_MAX_REQUESTS = 5;
export const WALK_IN_RATE_LIMIT_MAX_REQUESTS = 30;
export const RATE_LIMIT_WINDOW = "10 m" as const;

export type PublicFormRoute =
  | "contact"
  | "exhibitor-applications"
  | "sponsor-inquiries"
  | "visitor-registrations"
  | "walk-in-registrations";

/** Per-route public limits (defaults to RATE_LIMIT_MAX_REQUESTS when omitted). */
export const PUBLIC_FORM_RATE_LIMITS: Record<
  PublicFormRoute,
  { max: number; window: typeof RATE_LIMIT_WINDOW }
> = {
  contact: { max: RATE_LIMIT_MAX_REQUESTS, window: RATE_LIMIT_WINDOW },
  "exhibitor-applications": { max: RATE_LIMIT_MAX_REQUESTS, window: RATE_LIMIT_WINDOW },
  "sponsor-inquiries": { max: RATE_LIMIT_MAX_REQUESTS, window: RATE_LIMIT_WINDOW },
  "visitor-registrations": { max: RATE_LIMIT_MAX_REQUESTS, window: RATE_LIMIT_WINDOW },
  "walk-in-registrations": { max: WALK_IN_RATE_LIMIT_MAX_REQUESTS, window: RATE_LIMIT_WINDOW },
};

/**
 * Admin check-in: scans every few seconds during a rush, plus name lookups on
 * the same bucket — err generous so staff never hit 429 mid-shift.
 */
export const ADMIN_RATE_LIMITS = {
  communicationsSend: { max: 10, window: "10 m" as const, prefix: "altfff:admin:comms" },
  uploadUrl: { max: 30, window: "10 m" as const, prefix: "altfff:admin:upload" },
  checkin: { max: 600, window: "10 m" as const, prefix: "altfff:admin:checkin" },
} as const;

/**
 * Lazy construction - same build-safety pattern as qstash/r2/supabase
 * admin clients. A missing env var must not throw during Next's build-time
 * page-data collection.
 *
 * FAIL OPEN (deliberate): if Redis env vars are missing, or the Redis/
 * Ratelimit call itself throws, we log a warning and allow the request.
 * Blocking real form submissions over a rate-limiter outage or incomplete
 * local env would be worse than briefly going unprotected - tonight's
 * pattern of hard failures taught that lesson. Rate limiting is a
 * safety net, not a hard dependency of the submit path.
 */
let missingEnvWarned = false;
const publicLimiterCache = new Map<string, Ratelimit>();
const adminLimiterCache = new Map<string, Ratelimit>();

function getPublicLimiter(max: number, window: Duration): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!missingEnvWarned) {
      missingEnvWarned = true;
      console.warn(
        "[rateLimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set - rate limiting disabled (fail open).",
      );
    }
    return null;
  }

  const cacheKey = `${max}:${window}`;
  if (!publicLimiterCache.has(cacheKey)) {
    publicLimiterCache.set(
      cacheKey,
      new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(max, window),
        prefix: "altfff:form",
        analytics: false,
      }),
    );
  }
  return publicLimiterCache.get(cacheKey)!;
}

function getAdminLimiter(max: number, window: Duration, prefix: string): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const cacheKey = `${prefix}:${max}:${window}`;
  if (!adminLimiterCache.has(cacheKey)) {
    adminLimiterCache.set(
      cacheKey,
      new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(max, window),
        prefix,
        analytics: false,
      }),
    );
  }
  return adminLimiterCache.get(cacheKey)!;
}

async function runLimitCheck(
  limiter: Ratelimit,
  identifier: string,
  routeLabel: string,
): Promise<{ success: boolean }> {
  try {
    const result = await limiter.limit(identifier);
    return { success: result.success };
  } catch (err) {
    console.warn(`[rateLimit] Redis/Ratelimit call failed (${routeLabel}) - allowing (fail open):`, err);
    reportServerError(err, {
      route: `rateLimit:${routeLabel}`,
      kind: "redis",
      extra: { failOpen: true },
    });
    return { success: true };
  }
}

/** First address in x-forwarded-for, or a stable fallback - never throws. */
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
  const config = PUBLIC_FORM_RATE_LIMITS[route];
  const limiter = getPublicLimiter(config.max, config.window);
  if (!limiter) return { success: true };

  const ip = getClientIp(request);
  // Route prefix keeps exhibitor attempts from counting against visitor, etc.
  const identifier = `${route}:${ip}`;
  return runLimitCheck(limiter, identifier, route);
}

/** Per-admin-user rate limit for authenticated admin API routes. */
export async function checkAdminRateLimit(
  request: Request,
  adminUserId: string,
  config: (typeof ADMIN_RATE_LIMITS)[keyof typeof ADMIN_RATE_LIMITS],
  routeLabel: string,
): Promise<{ success: boolean }> {
  const limiter = getAdminLimiter(config.max, config.window, config.prefix);
  if (!limiter) return { success: true };

  const ip = getClientIp(request);
  const identifier = `${adminUserId}:${ip}`;
  return runLimitCheck(limiter, identifier, routeLabel);
}
