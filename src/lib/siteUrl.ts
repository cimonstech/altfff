import { SITE } from "@/lib/constants";

/**
 * Absolute base URL of this deployment, no trailing slash.
 * Shared by QStash callbacks, admin invite redirects, and anything else
 * that builds outbound URLs server-side.
 *
 * Order: explicit SITE_URL → production canonical SITE.url → Vercel preview
 * host → localhost (dev only).
 *
 * Supabase Auth only honours redirectTo when it matches an allowed redirect
 * URL. If we pass localhost (or any unlisted URL) from a production deploy
 * where SITE_URL was never set, GoTrue silently falls back to the project's
 * Site URL — https://www.altfff.com with no path — which is the broken invite
 * behaviour we saw in production emails.
 */
function isLoopbackSiteUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function getSiteUrl(): string {
  const fromEnv = process.env.SITE_URL?.trim();
  if (fromEnv) {
    const normalized = fromEnv.replace(/\/+$/, "");
    // A copied .env.local value (http://localhost:3000) must not break QStash
    // callbacks or admin invite redirects on the live Vercel deployment.
    if (process.env.NODE_ENV === "production" && isLoopbackSiteUrl(normalized)) {
      return SITE.url;
    }
    return normalized;
  }

  if (process.env.NODE_ENV === "production") {
    return SITE.url;
  }

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return `https://${vercelHost}`.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

/** Public event programme app — schedule, rooms, directory. */
export function getProgrammeUrl(): string {
  return `${getSiteUrl()}/programme`;
}
