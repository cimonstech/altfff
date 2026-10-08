import type { SupabaseClient } from "@supabase/supabase-js";
import { queueDelaySecondsForIndex } from "@/lib/communicationDelivery";
import { logMessageFireAndForget, MESSAGE_TYPES, type MessageLogStatus } from "@/lib/messageLog";
import { sendVisitorApprovedEmail, type VisitorRow } from "@/lib/visitorVetting";

export const BULK_CONFIRMATION_RESEND_CAP = 2000;
export const BULK_CONFIRMATION_SUBJECT = "Your Alt.FFF visit is confirmed - QR code inside";

export type BulkResendMode = "all_confirmed" | "resume_quota";

export type BulkResendBatchRow = {
  id: string;
  created_at: string;
  mode: BulkResendMode;
  resume_from_batch_id: string | null;
  status: string;
  recipient_count: number;
  queued_count: number;
  sent_by_email: string | null;
};

export type BulkResendSummary = {
  batchId: string;
  status: string;
  mode: BulkResendMode;
  createdAt: string;
  sentByEmail: string | null;
  resumeFromBatchId: string | null;
  counts: {
    total: number;
    queued: number;
    sent: number;
    quota_exceeded: number;
    failed: number;
    pending: number;
  };
  quotaExceeded: Array<{ visitorId: string; name: string | null; email: string | null }>;
  failed: Array<{ visitorId: string; name: string | null; email: string | null; error: string }>;
};

/** Pre-registered confirmed visitors with a real qr_token (walk-ins excluded). */
export async function fetchAllConfirmedResendTargets(
  supabase: SupabaseClient,
): Promise<VisitorRow[]> {
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("id, email, full_name, status, qr_token, source")
    .eq("status", "confirmed")
    .not("qr_token", "is", null)
    .neq("source", "walk_in")
    .limit(BULK_CONFIRMATION_RESEND_CAP);

  if (error) throw error;

  return (data ?? [])
    .filter((row) => typeof row.qr_token === "string" && row.qr_token.trim().length > 0)
    .map((row) => ({
      id: row.id as string,
      email: row.email as string,
      full_name: (row.full_name as string | null) ?? null,
      status: row.status as string,
      qr_token: row.qr_token as string,
    }));
}

/** Visitor ids from a paused batch whose latest bulk resend attempt is still quota_exceeded. */
export async function fetchQuotaExceededVisitorIds(
  supabase: SupabaseClient,
  sourceBatchId: string,
): Promise<string[]> {
  const { data: latestLogs, error: latestError } = await supabase
    .from("message_log")
    .select("related_id, status, sent_at")
    .eq("message_type", MESSAGE_TYPES.bulkConfirmationResend)
    .not("related_id", "is", null)
    .order("sent_at", { ascending: false });

  if (latestError) throw latestError;

  const latestStatusByVisitor = new Map<string, MessageLogStatus>();
  for (const row of latestLogs ?? []) {
    const visitorId = row.related_id as string;
    if (!latestStatusByVisitor.has(visitorId)) {
      latestStatusByVisitor.set(visitorId, row.status as MessageLogStatus);
    }
  }

  const { data: inSourceBatch, error: batchError } = await supabase
    .from("message_log")
    .select("related_id")
    .eq("batch_id", sourceBatchId)
    .eq("message_type", MESSAGE_TYPES.bulkConfirmationResend)
    .eq("status", "quota_exceeded")
    .not("related_id", "is", null);

  if (batchError) throw batchError;

  const seen = new Set<string>();
  const visitorIds: string[] = [];
  for (const row of inSourceBatch ?? []) {
    const visitorId = row.related_id as string;
    if (seen.has(visitorId)) continue;
    seen.add(visitorId);
    if (latestStatusByVisitor.get(visitorId) === "quota_exceeded") {
      visitorIds.push(visitorId);
    }
  }

  return visitorIds;
}

export async function fetchVisitorsByIds(
  supabase: SupabaseClient,
  visitorIds: string[],
): Promise<VisitorRow[]> {
  if (visitorIds.length === 0) return [];

  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("id, email, full_name, status, qr_token")
    .in("id", visitorIds)
    .eq("status", "confirmed");

  if (error) throw error;

  return (data ?? [])
    .filter((row) => typeof row.qr_token === "string" && row.qr_token.trim().length > 0)
    .map((row) => ({
      id: row.id as string,
      email: row.email as string,
      full_name: (row.full_name as string | null) ?? null,
      status: row.status as string,
      qr_token: row.qr_token as string,
    }));
}

export async function findLatestBatchWithQuotaExceeded(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("bulk_confirmation_resend_batch")
    .select("id")
    .eq("status", "paused_quota")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const batchId = data?.id;
  if (typeof batchId !== "string") return null;

  const remaining = await fetchQuotaExceededVisitorIds(supabase, batchId);
  return remaining.length > 0 ? batchId : null;
}

export async function processBulkConfirmationResendJob(
  supabase: SupabaseClient,
  batchId: string,
  visitorId: string,
): Promise<void> {
  const { data: visitor, error } = await supabase
    .from("visitor_registrations")
    .select("id, email, full_name, status, qr_token, source")
    .eq("id", visitorId)
    .maybeSingle();

  if (error || !visitor) {
    console.error("bulk resend: visitor not found", visitorId, error);
    logMessageFireAndForget({
      channel: "email",
      messageType: MESSAGE_TYPES.bulkConfirmationResend,
      status: "failed",
      recipientEmail: null,
      recipientName: null,
      subjectOrSummary: BULK_CONFIRMATION_SUBJECT,
      relatedTable: "visitor_registrations",
      relatedId: visitorId,
      batchId,
      errorDetail: error?.message ?? "Visitor not found",
    });
    await recomputeBulkResendBatchStatus(supabase, batchId);
    return;
  }

  if (visitor.status !== "confirmed") {
    logMessageFireAndForget({
      channel: "email",
      messageType: MESSAGE_TYPES.bulkConfirmationResend,
      status: "failed",
      recipientEmail: visitor.email as string,
      recipientName: (visitor.full_name as string | null) ?? null,
      subjectOrSummary: BULK_CONFIRMATION_SUBJECT,
      relatedTable: "visitor_registrations",
      relatedId: visitorId,
      batchId,
      errorDetail: `Visitor status is ${visitor.status}, not confirmed.`,
    });
    await recomputeBulkResendBatchStatus(supabase, batchId);
    return;
  }

  const qrToken = typeof visitor.qr_token === "string" ? visitor.qr_token.trim() : "";
  if (!qrToken || visitor.source === "walk_in") {
    logMessageFireAndForget({
      channel: "email",
      messageType: MESSAGE_TYPES.bulkConfirmationResend,
      status: "failed",
      recipientEmail: visitor.email as string,
      recipientName: (visitor.full_name as string | null) ?? null,
      subjectOrSummary: BULK_CONFIRMATION_SUBJECT,
      relatedTable: "visitor_registrations",
      relatedId: visitorId,
      batchId,
      errorDetail: !qrToken ? "Missing QR token." : "Walk-in visitors are excluded from bulk resend.",
    });
    await recomputeBulkResendBatchStatus(supabase, batchId);
    return;
  }

  await sendVisitorApprovedEmail(visitor as VisitorRow, qrToken, {
    messageType: MESSAGE_TYPES.bulkConfirmationResend,
    batchId,
  });

  await recomputeBulkResendBatchStatus(supabase, batchId);
}

export async function summarizeBulkResendBatch(
  supabase: SupabaseClient,
  batchId: string,
): Promise<BulkResendSummary | null> {
  const { data: batch, error: batchError } = await supabase
    .from("bulk_confirmation_resend_batch")
    .select("id, created_at, mode, resume_from_batch_id, status, recipient_count, queued_count, sent_by_email")
    .eq("id", batchId)
    .maybeSingle();

  if (batchError || !batch) return null;

  const { data: logs, error: logsError } = await supabase
    .from("message_log")
    .select("related_id, recipient_email, recipient_name, status, error_detail, sent_at")
    .eq("batch_id", batchId)
    .eq("message_type", MESSAGE_TYPES.bulkConfirmationResend)
    .order("sent_at", { ascending: false });

  if (logsError) throw logsError;

  let sent = 0;
  let quota_exceeded = 0;
  let failed = 0;
  const quotaExceeded: BulkResendSummary["quotaExceeded"] = [];
  const failedRows: BulkResendSummary["failed"] = [];
  const seenQuota = new Set<string>();
  const seenFailed = new Set<string>();

  for (const row of logs ?? []) {
    const visitorId = row.related_id as string | null;
    if (!visitorId) continue;

    if (row.status === "sent") sent++;
    else if (row.status === "quota_exceeded") {
      quota_exceeded++;
      if (!seenQuota.has(visitorId)) {
        seenQuota.add(visitorId);
        quotaExceeded.push({
          visitorId,
          name: (row.recipient_name as string | null) ?? null,
          email: (row.recipient_email as string | null) ?? null,
        });
      }
    } else if (row.status === "failed") {
      failed++;
      if (!seenFailed.has(visitorId)) {
        seenFailed.add(visitorId);
        failedRows.push({
          visitorId,
          name: (row.recipient_name as string | null) ?? null,
          email: (row.recipient_email as string | null) ?? null,
          error: (row.error_detail as string | null) ?? "Send failed",
        });
      }
    }
  }

  const logged = sent + quota_exceeded + failed;
  const pending = Math.max(0, (batch.queued_count as number) - logged);

  return {
    batchId: batch.id as string,
    status: batch.status as string,
    mode: batch.mode as BulkResendMode,
    createdAt: batch.created_at as string,
    sentByEmail: (batch.sent_by_email as string | null) ?? null,
    resumeFromBatchId: (batch.resume_from_batch_id as string | null) ?? null,
    counts: {
      total: batch.recipient_count as number,
      queued: batch.queued_count as number,
      sent,
      quota_exceeded,
      failed,
      pending,
    },
    quotaExceeded,
    failed: failedRows,
  };
}

export async function recomputeBulkResendBatchStatus(
  supabase: SupabaseClient,
  batchId: string,
): Promise<void> {
  const summary = await summarizeBulkResendBatch(supabase, batchId);
  if (!summary) return;

  const { total, sent, quota_exceeded, failed, pending } = summary.counts;
  let status: string;

  if (pending > 0) {
    status = "processing";
  } else if (quota_exceeded > 0) {
    status = "paused_quota";
  } else if (failed === total && total > 0) {
    status = "failed";
  } else {
    status = "completed";
  }

  if (sent + quota_exceeded + failed >= summary.counts.queued && pending === 0) {
    // keep computed status
  }

  await supabase.from("bulk_confirmation_resend_batch").update({ status }).eq("id", batchId);

  if (summary.mode === "resume_quota" && summary.resumeFromBatchId && status === "completed") {
    const remaining = await fetchQuotaExceededVisitorIds(supabase, summary.resumeFromBatchId);
    if (remaining.length === 0) {
      await supabase
        .from("bulk_confirmation_resend_batch")
        .update({ status: "completed" })
        .eq("id", summary.resumeFromBatchId);
    }
  }
}

export function bulkResendDelaySeconds(index: number): number {
  return queueDelaySecondsForIndex(index, true);
}

export { queueDelaySecondsForIndex };
