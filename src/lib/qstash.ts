import { Client } from "@upstash/qstash";

/**
 * SERVER-ONLY. QSTASH_TOKEN is a real credential - only import from Route
 * Handlers, never from a client component.
 *
 * QStash calls back over the public internet, so SITE_URL must point at a
 * real, publicly reachable deployment - it cannot reach http://localhost:3000.
 * In local dev this means queued (bulk, >1 recipient) sends cannot actually
 * be exercised end-to-end; a real deployed preview URL is needed for that.
 */
const qstashClient = new Client({ token: process.env.QSTASH_TOKEN! });

function getSiteUrl(): string {
  return process.env.SITE_URL ?? "http://localhost:3000";
}

/** Publishes a JSON payload to an absolute path on this deployment via QStash. */
export async function publishToQueue(path: string, body: unknown): Promise<{ messageId: string }> {
  const url = `${getSiteUrl()}${path}`;
  const result = await qstashClient.publishJSON({ url, body });
  return { messageId: result.messageId };
}
