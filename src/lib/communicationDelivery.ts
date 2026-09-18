import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/sms";
import {
  AUDIENCE_CONFIG,
  getMergeFieldValues,
  interpolateMergeFields,
  type AudienceType,
  type Channel,
} from "@/lib/communications";
import {
  emailStatusFromThrownError,
  logMessageFireAndForget,
  MESSAGE_TYPES,
} from "@/lib/messageLog";
import { buildEmailHtml, textToHtml } from "@/lib/emailTemplate";

/** Resend free/pro default: 10 requests/sec — stay under that when queueing bulk sends. */
export const RESEND_SENDS_PER_SECOND = 8;

export class CommunicationRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommunicationRateLimitError";
  }
}

function isResendRateLimitError(message: string): boolean {
  return /too many requests/i.test(message) || /rate limit/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendCommunicationEmail(
  resend: Resend,
  params: {
    fromEmail: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  },
): Promise<{ id?: string }> {
  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await resend.emails.send({
      from: `Alt.FFF <${params.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    if (!error) return { id: data?.id };

    if (isResendRateLimitError(error.message) && attempt < maxAttempts - 1) {
      await sleep(400 * (attempt + 1));
      continue;
    }
    if (isResendRateLimitError(error.message)) {
      throw new CommunicationRateLimitError(error.message);
    }
    throw new Error(error.message);
  }
  throw new CommunicationRateLimitError("Email rate limit exceeded.");
}

/**
 * SERVER-ONLY. Delivers one communication to one recipient and updates its
 * row - shared by the synchronous single-recipient path (send/route.ts) and
 * the QStash worker (process-recipient/route.ts) so the actual send logic
 * exists in exactly one place. Callers pass whichever Supabase client fits
 * their auth context: the session-scoped server client for the sync path,
 * the service-role admin client for the worker (which has no user session).
 */
export async function processRecipient(
  supabase: SupabaseClient,
  params: {
    communicationId: string;
    recipientId: string;
    channel: Channel;
    subject: string | null;
    body: string;
    mergeFields: Record<string, string>;
  },
): Promise<void> {
  const { data: recipient, error: recipientError } = await supabase
    .from("communication_recipients")
    .select("recipient_email, recipient_phone, recipient_name")
    .eq("id", params.recipientId)
    .single();

  if (recipientError || !recipient) {
    console.error("processRecipient: recipient row not found", params.recipientId, recipientError);
    return;
  }

  const interpolatedBody = interpolateMergeFields(params.body, params.mergeFields);
  const interpolatedSubject = params.subject ? interpolateMergeFields(params.subject, params.mergeFields) : null;

  const recipientName =
    (typeof recipient.recipient_name === "string" ? recipient.recipient_name : null) ||
    params.mergeFields.name ||
    null;

  const errors: string[] = [];
  let attempted = false;
  let anySucceeded = false;

  if (params.channel === "email" || params.channel === "both") {
    const email = recipient.recipient_email as string | null;
    if (!email) {
      errors.push("No email address on file.");
    } else {
      attempted = true;
      const apiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL;
      if (!apiKey || !fromEmail) {
        errors.push("Email sending is not configured.");
        logMessageFireAndForget({
          channel: "email",
          messageType: MESSAGE_TYPES.bulkCommunicationEmail,
          status: "failed",
          recipientEmail: email,
          recipientName,
          subjectOrSummary: interpolatedSubject || "Alt.FFF",
          relatedTable: "communication_recipients",
          relatedId: params.recipientId,
          errorDetail: "Email sending is not configured.",
        });
      } else {
        try {
          const resend = new Resend(apiKey);
          const sendData = await sendCommunicationEmail(resend, {
            fromEmail,
            to: email,
            subject: interpolatedSubject || "Alt.FFF",
            text: interpolatedBody,
            html: buildEmailHtml({
              heading: interpolatedSubject || "Alt.FFF",
              bodyHtml: textToHtml(interpolatedBody),
            }),
          });
          anySucceeded = true;
          console.log("Resend accepted (communication):", params.communicationId, sendData.id);
          logMessageFireAndForget({
            channel: "email",
            messageType: MESSAGE_TYPES.bulkCommunicationEmail,
            status: "sent",
            recipientEmail: email,
            recipientName,
            subjectOrSummary: interpolatedSubject || "Alt.FFF",
            relatedTable: "communication_recipients",
            relatedId: params.recipientId,
          });
        } catch (err) {
          if (err instanceof CommunicationRateLimitError) {
            logMessageFireAndForget({
              channel: "email",
              messageType: MESSAGE_TYPES.bulkCommunicationEmail,
              status: "quota_exceeded",
              recipientEmail: email,
              recipientName,
              subjectOrSummary: interpolatedSubject || "Alt.FFF",
              relatedTable: "communication_recipients",
              relatedId: params.recipientId,
              errorDetail: err.message,
            });
            throw err;
          }
          const detail = err instanceof Error ? err.message : "send failed";
          errors.push(`Email: ${detail}`);
          logMessageFireAndForget({
            channel: "email",
            messageType: MESSAGE_TYPES.bulkCommunicationEmail,
            status: emailStatusFromThrownError(err),
            recipientEmail: email,
            recipientName,
            subjectOrSummary: interpolatedSubject || "Alt.FFF",
            relatedTable: "communication_recipients",
            relatedId: params.recipientId,
            errorDetail: detail,
          });
        }
      }
    }
  }

  if (params.channel === "sms" || params.channel === "both") {
    const phone = recipient.recipient_phone as string | null;
    if (!phone) {
      errors.push("No phone number on file.");
    } else {
      attempted = true;
      const result = await sendSms(phone, interpolatedBody, `communication-${params.communicationId}`, {
        messageType: MESSAGE_TYPES.bulkCommunicationSms,
        recipientEmail: recipient.recipient_email as string | null,
        recipientName,
        subjectOrSummary: interpolatedSubject || interpolatedBody.slice(0, 120),
        relatedTable: "communication_recipients",
        relatedId: params.recipientId,
      });
      if (result.success) anySucceeded = true;
      else errors.push(`SMS: ${result.error ?? "send failed"}`);
    }
  }

  // "both" with one channel succeeding and the other failing is still
  // recorded as 'sent' (the schema has no per-recipient partial state) -
  // the failed half is preserved in error_message so it's visible in the
  // history view, and the parent communication_log can still roll up to
  // 'partially_failed' across recipients even though this one row reads 'sent'.
  const status = attempted && anySucceeded ? "sent" : "failed";

  const { error: updateError } = await supabase
    .from("communication_recipients")
    .update({
      status,
      sent_at: new Date().toISOString(),
      error_message: errors.length > 0 ? errors.join(" ") : null,
    })
    .eq("id", params.recipientId);
  if (updateError) {
    console.error("processRecipient: failed to update recipient status", params.recipientId, updateError);
  }

  await recomputeCommunicationStatus(supabase, params.communicationId);
}

/** Rebuild merge fields for a failed recipient retry (name snapshot + table re-fetch when needed). */
export async function resolveRetryMergeFields(
  supabase: SupabaseClient,
  audienceType: string,
  recipient: {
    recipient_email: string | null;
    recipient_name: string | null;
  },
): Promise<Record<string, string>> {
  const fallback = { name: recipient.recipient_name ?? "" };

  if (audienceType === "custom") return fallback;

  const audience = audienceType as AudienceType;
  if (!(audience in AUDIENCE_CONFIG)) return fallback;

  const config = AUDIENCE_CONFIG[audience];
  if (!recipient.recipient_email) return fallback;

  const { data } = await supabase
    .from(config.table)
    .select(config.selectColumns)
    .eq("email", recipient.recipient_email)
    .maybeSingle();

  if (!data) return fallback;
  return getMergeFieldValues(audience, data as unknown as Record<string, unknown>);
}

export function queueDelaySecondsForIndex(index: number, sendsEmail: boolean): number {
  if (!sendsEmail) return 0;
  return Math.floor(index / RESEND_SENDS_PER_SECOND);
}

async function recomputeCommunicationStatus(supabase: SupabaseClient, communicationId: string): Promise<void> {
  const { data: recipients, error } = await supabase
    .from("communication_recipients")
    .select("status")
    .eq("communication_id", communicationId);
  if (error || !recipients) {
    console.error("recomputeCommunicationStatus: failed to load recipients", communicationId, error);
    return;
  }

  let pending = 0;
  let sent = 0;
  let failed = 0;
  for (const row of recipients) {
    if (row.status === "pending") pending++;
    else if (row.status === "sent") sent++;
    else if (row.status === "failed") failed++;
  }

  const newStatus = pending > 0 ? "sending" : failed === 0 ? "sent" : sent === 0 ? "failed" : "partially_failed";

  const { error: updateError } = await supabase
    .from("communication_log")
    .update({ status: newStatus })
    .eq("id", communicationId);
  if (updateError) {
    console.error("recomputeCommunicationStatus: failed to update communication_log", communicationId, updateError);
  }
}
