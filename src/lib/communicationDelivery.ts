import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/sms";
import { interpolateMergeFields, type Channel } from "@/lib/communications";
import { buildEmailHtml, textToHtml } from "@/lib/emailTemplate";

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
    .select("recipient_email, recipient_phone")
    .eq("id", params.recipientId)
    .single();

  if (recipientError || !recipient) {
    console.error("processRecipient: recipient row not found", params.recipientId, recipientError);
    return;
  }

  const interpolatedBody = interpolateMergeFields(params.body, params.mergeFields);
  const interpolatedSubject = params.subject ? interpolateMergeFields(params.subject, params.mergeFields) : null;

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
      } else {
        try {
          const resend = new Resend(apiKey);
          // TEMPORARY: RESEND_FROM_EMAIL is a borrowed-domain sender address,
          // same as every other outbound email route in this project.
          const { data: sendData, error: sendError } = await resend.emails.send({
            from: `Alt.FFF <${fromEmail}>`,
            to: email,
            subject: interpolatedSubject || "Alt.FFF",
            text: interpolatedBody,
            html: buildEmailHtml({
              heading: interpolatedSubject || "Alt.FFF",
              bodyHtml: textToHtml(interpolatedBody),
            }),
          });
          if (sendError) errors.push(`Email: ${sendError.message}`);
          else {
            anySucceeded = true;
            console.log("Resend accepted (communication):", params.communicationId, sendData?.id);
          }
        } catch (err) {
          errors.push(`Email: ${err instanceof Error ? err.message : "send failed"}`);
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
      const result = await sendSms(phone, interpolatedBody, `communication-${params.communicationId}`);
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
