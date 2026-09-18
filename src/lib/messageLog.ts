/**
 * SERVER-ONLY. Unified message_log writes for every email and SMS the app sends.
 * Uses the service-role client so public form routes can log without an admin session.
 */
import { createAdminClient } from "@/lib/supabase/admin";

export type MessageLogChannel = "email" | "sms";
export type MessageLogStatus = "sent" | "failed" | "quota_exceeded";

export const MESSAGE_TYPES = {
  visitorRegistrationConfirmation: "visitor_registration_confirmation",
  visitorRegistrationInternal: "visitor_registration_internal",
  exhibitorApplicationConfirmation: "exhibitor_application_confirmation",
  exhibitorApplicationInternal: "exhibitor_application_internal",
  sponsorInquiryConfirmation: "sponsor_inquiry_confirmation",
  sponsorInquiryInternal: "sponsor_inquiry_internal",
  contactInternal: "contact_internal",
  walkInConfirmationEmail: "walk_in_confirmation_email",
  walkInConfirmationSms: "walk_in_confirmation_sms",
  visitorApprovalQr: "visitor_approval_qr",
  visitorDeclined: "visitor_declined",
  visitorConfirmationResend: "visitor_confirmation_resend",
  bulkConfirmationResend: "bulk_confirmation_resend",
  bulkCommunicationEmail: "bulk_communication_email",
  bulkCommunicationSms: "bulk_communication_sms",
  checkInWelcomeSms: "check_in_welcome_sms",
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export type LogMessageInput = {
  channel: MessageLogChannel;
  messageType: MessageType | string;
  status: MessageLogStatus;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientName?: string | null;
  subjectOrSummary?: string | null;
  relatedTable?: string | null;
  relatedId?: string | null;
  batchId?: string | null;
  errorDetail?: string | null;
  sentAt?: string;
};

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function normalizePhone(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

/** Classify a Resend error message into message_log.status. */
export function classifyResendError(message: string | null | undefined): MessageLogStatus {
  if (!message) return "failed";
  if (/quota exceeded|daily.*limit|monthly.*limit|sending limit|exceeded your.*quota|reached your daily|daily email/i.test(message)) {
    return "quota_exceeded";
  }
  return "failed";
}

export function emailStatusFromResendError(sendError: { message?: string } | null): MessageLogStatus {
  if (!sendError) return "sent";
  return classifyResendError(sendError.message ?? null);
}

export function emailStatusFromThrownError(err: unknown): MessageLogStatus {
  const message = err instanceof Error ? err.message : String(err ?? "send failed");
  return classifyResendError(message);
}

export function smsStatusFromResult(success: boolean): MessageLogStatus {
  return success ? "sent" : "failed";
}

/** Fail-open insert — never throws to callers. */
export async function logMessage(input: LogMessageInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("message_log").insert({
      channel: input.channel,
      recipient_email: normalizeEmail(input.recipientEmail),
      recipient_phone: normalizePhone(input.recipientPhone),
      recipient_name: input.recipientName?.trim() || null,
      message_type: input.messageType,
      subject_or_summary: input.subjectOrSummary?.trim() || null,
      related_table: input.relatedTable ?? null,
      related_id: input.relatedId ?? null,
      batch_id: input.batchId ?? null,
      status: input.status,
      error_detail: input.errorDetail?.trim() || null,
      sent_at: input.sentAt ?? new Date().toISOString(),
    });
    if (error) {
      console.error("message_log insert failed:", error.message, input.messageType);
    }
  } catch (err) {
    console.error("message_log insert threw:", err);
  }
}

export function logMessageFireAndForget(input: LogMessageInput): void {
  void logMessage(input);
}
