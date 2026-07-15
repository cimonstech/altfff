import type { NextConfig } from "next";

/**
 * Public hostname of the Cloudflare R2 bucket that will serve real
 * photography. Placeholder until the bucket is provisioned — replace
 * with e.g. "pub-xxxxxxxxxxxxxxxx.r2.dev" or the custom domain.
 */
const R2_PUBLIC_HOSTNAME = "pub-REPLACE-WITH-BUCKET-ID.r2.dev";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: R2_PUBLIC_HOSTNAME,
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
