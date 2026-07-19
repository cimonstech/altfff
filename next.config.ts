import type { NextConfig } from "next";

/**
 * Derived from R2_PUBLIC_URL rather than hardcoded - next.config.ts runs in
 * Node at build/start time (never shipped to the browser), so reading
 * process.env directly here is safe even though R2_PUBLIC_URL isn't
 * NEXT_PUBLIC_-prefixed. Falls back to a placeholder hostname (matching
 * nothing real) if the env var isn't set yet, so config parsing itself
 * never crashes - uploaded/rendered images would just fail to load until
 * the env var is actually configured, which is the correct failure mode.
 */
function getR2Hostname(): string {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) return "pub-REPLACE-WITH-BUCKET-ID.r2.dev";
  try {
    return new URL(url).hostname;
  } catch {
    return "pub-REPLACE-WITH-BUCKET-ID.r2.dev";
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: getR2Hostname(),
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
