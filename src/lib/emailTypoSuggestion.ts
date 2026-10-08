/** Well-known providers — typo hints only, never hard blocks. */
export const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
] as const;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[b.length];
}

/** Returns a full suggested email, or null when no close known-domain match. */
export function suggestCommonEmailDomain(email: string): string | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) return null;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (!domain || domain.includes(" ") || !domain.includes(".")) return null;
  if ((COMMON_EMAIL_DOMAINS as readonly string[]).includes(domain)) return null;

  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const known of COMMON_EMAIL_DOMAINS) {
    const distance = levenshtein(domain, known);
    if (distance >= 1 && distance <= 2 && distance < bestDistance) {
      best = known;
      bestDistance = distance;
    }
  }

  return best ? `${local}@${best}` : null;
}
