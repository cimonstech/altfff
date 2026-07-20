/**
 * Absolute base URL of this deployment, no trailing slash.
 * Shared by QStash callbacks, admin invite redirects, and anything else
 * that builds outbound URLs server-side.
 */
export function getSiteUrl(): string {
  const raw = process.env.SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
