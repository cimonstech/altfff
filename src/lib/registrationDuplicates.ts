import { Redis } from "@upstash/redis";
import { createAdminClient } from "@/lib/supabase/admin";

/** Visitor rows that block a fresh submission for the same email. */
export const VISITOR_BLOCKING_STATUSES = ["registered", "confirmed"] as const;

/** Exhibitor rows that block a fresh application for the same email. */
export const EXHIBITOR_BLOCKING_STATUSES = [
  "new",
  "under_review",
  "invoiced",
  "payment_received",
  "confirmed",
] as const;

export const VISITOR_DUPLICATE_EMAIL_MESSAGE =
  "You've already registered with this email — we'll be in touch.";

export const EXHIBITOR_DUPLICATE_EMAIL_MESSAGE =
  "You've already applied with this email — we'll be in touch.";

export class DuplicateRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateRegistrationError";
  }
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Case-insensitive email match against active pipeline rows. Uses the
 * service-role client because anon insert policies cannot read existing rows.
 */
export async function findBlockingRegistrationByEmail(
  table: "visitor_registrations" | "exhibitor_applications",
  email: string,
  blockingStatuses: readonly string[],
): Promise<{ id: string; status: string } | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .select("id, status")
    .in("status", [...blockingStatuses])
    .ilike("email", escapeIlike(trimmed))
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Duplicate check failed for ${table}:`, error);
    throw error;
  }

  return data;
}

/**
 * Serialises check+insert for a single email so parallel POSTs cannot both
 * pass the duplicate query before either insert lands. Fail-open when Redis
 * is unavailable (same policy as rate limiting).
 */
export async function withRegistrationEmailLock<T>(
  scope: "visitor" | "exhibitor",
  email: string,
  run: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();
  if (!redis) return run();

  const key = `altfff:register:${scope}:${email.trim().toLowerCase()}`;
  const acquired = await redis.set(key, "1", { nx: true, ex: 15 });
  if (!acquired) {
    throw new DuplicateRegistrationError(
      scope === "visitor" ? VISITOR_DUPLICATE_EMAIL_MESSAGE : EXHIBITOR_DUPLICATE_EMAIL_MESSAGE,
    );
  }

  try {
    return await run();
  } finally {
    await redis.del(key);
  }
}
