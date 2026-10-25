import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { buildContentSecurityPolicy, SECURITY_HEADERS } from "@/lib/securityHeaders";

/**
 * Derived from R2_PUBLIC_URL rather than hardcoded - next.config.ts runs in
 * Node at build/start time (never shipped to the browser), so reading
 * process.env directly here is safe even though R2_PUBLIC_URL isn't
 * NEXT_PUBLIC_-prefixed. Falls back to a placeholder hostname (matching
 * nothing real) if the env var isn't set yet, so config parsing itself
 * never crashes - uploaded/rendered images would just fail to load until
 * the env var is actually configured, which is the correct failure mode.
 */
function getR2Hostname(): string | null {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const r2Hostname = getR2Hostname();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: r2Hostname
      ? [
          {
            protocol: "https",
            hostname: r2Hostname,
            pathname: "/**",
          },
        ]
      : [],
  },
  async redirects() {
    return [
      { source: "/news", destination: "/blog", permanent: true },
      { source: "/news/:slug", destination: "/blog/:slug", permanent: true },
    ];
  },
  async headers() {
    const csp = buildContentSecurityPolicy(r2Hostname);
    return [
      {
        source: "/(.*)",
        headers: [...SECURITY_HEADERS, { key: "Content-Security-Policy", value: csp }],
      },
    ];
  },
};

/**
 * Source-map upload is optional: only when SENTRY_AUTH_TOKEN + org/project
 * are set (typically CI). Without them the SDK still captures errors via
 * NEXT_PUBLIC_SENTRY_DSN at runtime; builds must not fail for missing
 * Sentry CI credentials.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
