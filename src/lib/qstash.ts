import { Client } from "@upstash/qstash";
import { getSiteUrl } from "@/lib/siteUrl";

/**
 * SERVER-ONLY. QSTASH_TOKEN is a real credential - only import from Route
 * Handlers, never from a client component.
 *
 * QStash calls back over the public internet, so SITE_URL must point at a
 * real, publicly reachable deployment - it cannot reach http://localhost:3000.
 * In local dev this means queued (bulk, >1 recipient) sends cannot actually
 * be exercised end-to-end; a real deployed preview URL is needed for that.
 *
 * Built lazily (not as a top-level const) - constructing SDK clients at
 * module load time means a missing env var can throw during Next's
 * build-time page-data collection and crash the entire deployment, not just
 * this feature. Deferring construction until publishToQueue() actually runs
 * means a missing QSTASH_TOKEN only breaks the one feature that needs it.
 */
let cachedClient: Client | null = null;

function getQstashClient(): Client {
  if (!cachedClient) {
    cachedClient = new Client({ token: process.env.QSTASH_TOKEN! });
  }
  return cachedClient;
}

type PublishOptions = {
  /** Whole seconds before QStash delivers the message (used to stagger bulk sends). */
  delaySeconds?: number;
};

/** Publishes a JSON payload to an absolute path on this deployment via QStash. */
export async function publishToQueue(
  path: string,
  body: unknown,
  options?: PublishOptions,
): Promise<{ messageId: string }> {
  const url = `${getSiteUrl()}${path}`;
  const delay = options?.delaySeconds;
  const result = await getQstashClient().publishJSON({
    url,
    body,
    ...(typeof delay === "number" && delay > 0 ? { delay } : {}),
  });
  return { messageId: result.messageId };
}
