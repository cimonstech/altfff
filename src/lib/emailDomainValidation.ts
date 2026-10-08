import { promises as dns } from "dns";

/** Keep submissions responsive if a resolver is slow. */
export const EMAIL_MX_LOOKUP_TIMEOUT_MS = 2_500;

export const EMAIL_DOMAIN_INVALID_MESSAGE =
  "That email domain doesn't look like it can receive mail. Please check the address and try again.";

export type MxRecord = { exchange: string; priority: number };

export type EmailDomainCheckResult =
  | { ok: true; failOpen?: boolean }
  | { ok: false; message: string };

export type ResolveMxFn = (domain: string) => Promise<MxRecord[]>;

/**
 * Verifies the email domain has MX records. Fail open on resolver/network
 * problems; reject only when the lookup completes and the domain clearly
 * cannot receive mail (no MX / NXDOMAIN).
 */
export async function verifyEmailDomainAcceptsMail(
  email: string,
  resolveMx: ResolveMxFn = (domain) => dns.resolveMx(domain),
): Promise<EmailDomainCheckResult> {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) {
    return { ok: false, message: EMAIL_DOMAIN_INVALID_MESSAGE };
  }

  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(Object.assign(new Error("MX lookup timed out."), { code: "ETIMEOUT" })), EMAIL_MX_LOOKUP_TIMEOUT_MS);
      }),
    ]);

    if (!records.length) {
      return { ok: false, message: EMAIL_DOMAIN_INVALID_MESSAGE };
    }

    return { ok: true };
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";

    if (code === "ENOTFOUND" || code === "ENODATA") {
      return { ok: false, message: EMAIL_DOMAIN_INVALID_MESSAGE };
    }

    console.warn(
      `[email-domain] MX lookup failed open for ${domain} (${code || "unknown"}) — allowing submission.`,
    );

    return { ok: true, failOpen: true };
  }
}
