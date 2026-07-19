import { S3Client } from "@aws-sdk/client-s3";

/**
 * SERVER-ONLY. Never import this in a client component - R2_ACCESS_KEY_ID/
 * R2_SECRET_ACCESS_KEY are real credentials with write access to the
 * bucket. Only ever used from Route Handlers to generate presigned URLs;
 * the credentials themselves never leave the server, and the actual file
 * bytes never pass through the Next.js server either - the browser PUTs
 * directly to R2 using the presigned URL this produces.
 *
 * Built lazily (not as a top-level const) - constructing this at module
 * load time meant a missing R2 env var during Next's build-time page-data
 * collection could crash the entire deployment, not just this feature.
 * Deferring construction until a route handler actually calls getR2Client()
 * means a missing var only breaks the one feature that needs it.
 */
let cachedClient: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      // Without this, aws-sdk v3 defaults to virtual-hosted-style addressing
      // (bucket name as a subdomain: `${bucket}.${accountId}.r2.cloudflarestorage.com`)
      // for any DNS-compliant bucket name. R2 needs path-style addressing
      // instead (bucket name in the path) unless that subdomain is separately
      // configured - without forcePathStyle, presigned URLs point at a host
      // that doesn't correctly apply the bucket's CORS policy, and every
      // browser-side PUT fails preflight no matter how CORS is configured.
      forcePathStyle: true,
    });
  }
  return cachedClient;
}

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
