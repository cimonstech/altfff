/**
 * Security headers for next.config.ts — adapted from hardened Aaero Xpress patterns.
 * CSP is scoped to Alt.FFF's actual third parties (Supabase, R2, Sentry, GA, LinkedIn, Meta).
 *
 * unsafe-inline is required for Next.js App Router inline bootstrap scripts/styles.
 * unsafe-eval is required at runtime by GSAP/ScrollTrigger (property parsing) — without
 * it every GSAP animation fails site-wide (stat counters, Nav clip-path tweens, Ticker).
 * Verified via browser console: "Refused to evaluate a string as JavaScript because
 * 'unsafe-eval' is not an allowed source of script…"
 */
/**
 * R2 uses two browser-facing domains:
 * - pub-*.r2.dev (R2_PUBLIC_URL) — public read for rendered images (img-src + connect-src)
 * - *.r2.cloudflarestorage.com — presigned PUT target during direct browser upload
 */
function getR2UploadConnectSrc(): string {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  if (accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com`;
  }
  // Fallback when CSP is built before R2 is configured (e.g. local without .env)
  return "https://*.r2.cloudflarestorage.com";
}

export function buildContentSecurityPolicy(r2Hostname: string | null): string {
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
    : "*.supabase.co";

  const connectSrc = [
    "'self'",
    `https://${supabaseHost}`,
    `wss://${supabaseHost}`,
    "https://*.ingest.sentry.io",
    "https://*.sentry.io",
    "https://www.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://region1.google-analytics.com",
    "https://px.ads.linkedin.com",
    "https://snap.licdn.com",
    "https://connect.facebook.net",
    "https://www.facebook.com",
    // Presigned PUT from the browser (News cover upload, etc.)
    getR2UploadConnectSrc(),
  ];

  if (r2Hostname) {
    // Public-read CDN for already-uploaded assets (full round trip after upload)
    connectSrc.push(`https://${r2Hostname}`);
  }

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https://www.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://px.ads.linkedin.com",
    // LinkedIn Insight Tag cookie-sync redirect (li_sync) — verified via scripts/verify-linkedin-csp.mjs
    "https://www.linkedin.com",
    "https://www.facebook.com",
    // react-phone-number-input default flagUrl (CountryIcon.js → GH.svg etc.)
    "https://purecatamphetamine.github.io",
  ];
  if (r2Hostname) imgSrc.push(`https://${r2Hostname}`);

  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://snap.licdn.com https://connect.facebook.net",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];

  return directives.join("; ");
}

export const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
] as const;
