/**
 * Environment-prefixed R2 object keys so staging uploads never appear on production.
 * Uses R2_STORAGE_PREFIX when set; otherwise maps Vercel/Node environment:
 *   production -> prod/
 *   everything else -> staging/
 */
export function getR2StoragePrefix(): string {
  const explicit = process.env.R2_STORAGE_PREFIX?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;

  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
  return env === "production" ? "prod" : "staging";
}

/** Build a full R2 object key under the news/ folder with environment prefix. */
export function buildNewsImageKey(filename: string): string {
  const prefix = getR2StoragePrefix();
  return `${prefix}/news/${filename}`;
}

/** Returns true when key belongs to this deployment's prefix (for delete safety). */
export function isOwnedR2Key(key: string): boolean {
  const prefix = getR2StoragePrefix();
  return key.startsWith(`${prefix}/news/`);
}
