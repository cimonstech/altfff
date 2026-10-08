import { randomBytes } from "crypto";

/** UX/organizational prefix - not a security boundary. */
export const QR_TOKEN_PREFIX = "ALTEVT-" as const;

/** Random code length (8-10 range; fixed at 9 for readability). */
export const QR_TOKEN_CODE_LENGTH = 9;

/** Excludes 0/O, 1/I/l and lowercase to avoid visual ambiguity when typed. */
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
  }
  return out;
}

export function generateQrToken(): string {
  return `${QR_TOKEN_PREFIX}${randomCode(QR_TOKEN_CODE_LENGTH)}`;
}

/**
 * Normalises manual entry: staff type only the short code; full QR scans already
 * include the prefix. Accepts either form.
 */
export function normalizeCheckInToken(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return "";

  if (trimmed.startsWith(QR_TOKEN_PREFIX)) {
    return trimmed;
  }

  if (trimmed.startsWith("ALTEVT")) {
    const rest = trimmed.slice(6).replace(/^-/, "");
    return rest ? `${QR_TOKEN_PREFIX}${rest}` : "";
  }

  return `${QR_TOKEN_PREFIX}${trimmed}`;
}

export function isQrTokenFormat(token: string): boolean {
  if (!token.startsWith(QR_TOKEN_PREFIX)) return false;
  const code = token.slice(QR_TOKEN_PREFIX.length);
  if (code.length < 8 || code.length > 10) return false;
  return [...code].every((c) => CODE_CHARS.includes(c));
}
