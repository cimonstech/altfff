import { createHash } from "crypto";
import { reportServerError } from "@/lib/sentryReport";
import {
  buildMailchimpMergeFields,
  type MailchimpSyncFields,
} from "@/lib/mailchimpMergeFields";

export type MailchimpSource = MailchimpSyncFields["source"];

const MAILCHIMP_FETCH_TIMEOUT_MS = 6_000;

/** Checkbox: FormData/JSON includes a non-empty string when checked (usually "on"). */
export function parseNewsletterOptIn(newsletter: unknown): boolean {
  return typeof newsletter === "string" && newsletter.length > 0;
}

function subscriberHash(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

function getMailchimpConfig():
  | { apiKey: string; serverPrefix: string; audienceId: string }
  | null {
  const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX?.trim();
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim();
  if (!apiKey || !serverPrefix || !audienceId) return null;
  return { apiKey, serverPrefix, audienceId };
}

type MailchimpErrorJson = {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Array<{ field?: string; message?: string }>;
};

/** Human-readable Mailchimp API error for console (no subscriber PII). */
function formatMailchimpErrorBody(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "(empty response body)";
  try {
    const parsed = JSON.parse(trimmed) as MailchimpErrorJson;
    const lines: string[] = [];
    if (parsed.title) lines.push(`title: ${parsed.title}`);
    if (parsed.detail) lines.push(`detail: ${parsed.detail}`);
    if (parsed.errors?.length) {
      for (const err of parsed.errors) {
        const field = err.field ?? "(unknown field)";
        const message = err.message ?? "(no message)";
        lines.push(`field_error: ${field} - ${message}`);
      }
    }
    if (lines.length > 0) return lines.join(" | ");
  } catch {
    // Not JSON - log a bounded raw snippet.
  }
  return trimmed.length > 800 ? `${trimmed.slice(0, 800)}…` : trimmed;
}

function logMailchimpFailure(
  route: string,
  source: MailchimpSource,
  reason: string,
  extra?: Record<string, string | number | boolean | null | undefined>,
  mailchimpErrorBody?: string,
): void {
  const mailchimpDetail =
    mailchimpErrorBody !== undefined ? formatMailchimpErrorBody(mailchimpErrorBody) : null;
  if (mailchimpDetail) {
    console.error(
      `[mailchimp] sync failed route=${route} source=${source} reason=${reason} | ${mailchimpDetail}`,
    );
  } else {
    console.error(`[mailchimp] sync failed route=${route} source=${source} reason=${reason}`);
  }
  reportServerError(new Error(`Mailchimp sync failed: ${reason}`), {
    route,
    kind: "email",
    extra: {
      op: "mailchimp_sync",
      source,
      reason,
      ...(mailchimpDetail ? { mailchimp_detail: mailchimpDetail.slice(0, 500) } : {}),
      ...extra,
    },
  });
}

/**
 * Upserts a consenting subscriber into FFA's existing Mailchimp audience.
 * Uses PUT /lists/{list_id}/members/{subscriber_hash} (stable v3 endpoint).
 * Never throws - failures are logged to Sentry and do not affect form success.
 */
export async function syncToMailchimp(
  params: {
    email: string;
    route: string;
  } & MailchimpSyncFields,
): Promise<void> {
  const { email, route, ...fieldPayload } = params;
  const source = fieldPayload.source;
  const { merge_fields, unmapped } = buildMailchimpMergeFields(fieldPayload);
  if (unmapped.length > 0) {
    console.warn(
      `[mailchimp] unmapped form data source=${source} route=${route}: ${unmapped.join("; ")}`,
    );
  }

  const config = getMailchimpConfig();
  if (!config) {
    console.warn(
      "[mailchimp] sync skipped - MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, or MAILCHIMP_AUDIENCE_ID is not set.",
    );
    return;
  }

  const emailAddress = email.trim().toLowerCase();
  if (!emailAddress) return;

  const hash = subscriberHash(emailAddress);
  const url = `https://${config.serverPrefix}.api.mailchimp.com/3.0/lists/${config.audienceId}/members/${hash}`;
  const auth = Buffer.from(`anystring:${config.apiKey}`).toString("base64");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MAILCHIMP_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "PUT",
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: emailAddress,
        status_if_new: "subscribed",
        merge_fields,
        tags: [source],
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      logMailchimpFailure(
        route,
        source,
        `http_${res.status}`,
        { status: res.status, detail: errorBody.slice(0, 500) },
        errorBody,
      );
      return;
    }

    console.log(`[mailchimp] sync ok route=${route} source=${source} status=${res.status}`);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      logMailchimpFailure(route, source, "timeout", {
        timeout_ms: MAILCHIMP_FETCH_TIMEOUT_MS,
      });
      return;
    }
    logMailchimpFailure(route, source, err instanceof Error ? err.message : "unknown_error");
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Non-blocking Mailchimp mirror - form routes must not await the sync.
 * Runs independently after DB insert; only logs/Sentry on failure.
 */
export function scheduleMailchimpSync(
  params: {
    email: string;
    route: string;
  } & MailchimpSyncFields,
): void {
  void syncToMailchimp(params);
}
