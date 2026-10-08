import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";
import { publishToQueue } from "@/lib/qstash";
import {
  bulkResendDelaySeconds,
  fetchAllConfirmedResendTargets,
  fetchQuotaExceededVisitorIds,
  fetchVisitorsByIds,
  findLatestBatchWithQuotaExceeded,
  processBulkConfirmationResendJob,
  recomputeBulkResendBatchStatus,
  summarizeBulkResendBatch,
  type BulkResendMode,
} from "@/lib/bulkConfirmationResend";
import { reportServerError } from "@/lib/sentryReport";
import { ADMIN_RATE_LIMITS, checkAdminRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";

export const runtime = "nodejs";

type StartPayload = {
  mode?: unknown;
  resumeFromBatchId?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const rate = await checkAdminRateLimit(
    request,
    auth.user.id,
    ADMIN_RATE_LIMITS.communicationsSend,
    "admin/visitors/bulk-resend-confirmation",
  );
  if (!rate.success) {
    return NextResponse.json({ ok: false, error: RATE_LIMIT_ERROR_MESSAGE }, { status: 429 });
  }

  let payload: StartPayload = {};
  try {
    payload = await request.json();
  } catch {
    // Empty body defaults to all_confirmed.
  }

  const mode: BulkResendMode =
    payload.mode === "resume_quota" ? "resume_quota" : "all_confirmed";
  const resumeFromBatchId =
    typeof payload.resumeFromBatchId === "string" ? payload.resumeFromBatchId.trim() : "";

  const supabase = await createClient();
  const admin = createAdminClient();

  let visitors;
  let sourceBatchId: string | null = null;

  if (mode === "resume_quota") {
    sourceBatchId = resumeFromBatchId || (await findLatestBatchWithQuotaExceeded(admin));
    if (!sourceBatchId) {
      return NextResponse.json(
        { ok: false, error: "No batch with quota-exceeded sends found to resume." },
        { status: 400 },
      );
    }
    const visitorIds = await fetchQuotaExceededVisitorIds(admin, sourceBatchId);
    if (visitorIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No quota-exceeded recipients remain in that batch." },
        { status: 400 },
      );
    }
    visitors = await fetchVisitorsByIds(admin, visitorIds);
  } else {
    visitors = await fetchAllConfirmedResendTargets(admin);
  }

  if (visitors.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No confirmed pre-registered visitors with QR codes to resend." },
      { status: 400 },
    );
  }

  const { data: batch, error: batchError } = await admin
    .from("bulk_confirmation_resend_batch")
    .insert({
      sent_by: auth.user.id,
      sent_by_email: auth.user.email,
      mode,
      resume_from_batch_id: mode === "resume_quota" ? sourceBatchId : null,
      status: "queuing",
      recipient_count: visitors.length,
      queued_count: 0,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    reportServerError(batchError ?? new Error("bulk batch insert returned no row"), {
      route: "/api/admin/visitors/bulk-resend-confirmation",
      kind: "db",
      extra: { op: "insert_batch" },
    });
    return NextResponse.json({ ok: false, error: "Failed to create bulk resend batch." }, { status: 500 });
  }

  const batchId = batch.id as string;
  const jobs = visitors.map((visitor) => visitor.id);

  if (jobs.length === 1) {
    await processBulkConfirmationResendJob(admin, batchId, jobs[0]);
    await admin
      .from("bulk_confirmation_resend_batch")
      .update({ queued_count: 1, status: "processing" })
      .eq("id", batchId);
    await recomputeBulkResendBatchStatus(admin, batchId);
    const summary = await summarizeBulkResendBatch(admin, batchId);

    await supabase.from("activity_logs").insert({
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      action: "bulk_confirmation_resend",
      target_table: "bulk_confirmation_resend_batch",
      target_id: batchId,
      details: { mode, recipient_count: 1, resume_from_batch_id: sourceBatchId },
    });

    return NextResponse.json({ ok: true, batchId, summary });
  }

  let queuedCount = 0;
  let failedCount = 0;

  try {
    const results = await Promise.allSettled(
      jobs.map((visitorId, index) =>
        publishToQueue(
          "/api/admin/visitors/bulk-resend-confirmation/process",
          { batchId, visitorId },
          { delaySeconds: bulkResendDelaySeconds(index) },
        ),
      ),
    );

    queuedCount = results.filter((r) => r.status === "fulfilled").length;
    failedCount = results.length - queuedCount;
  } catch (err) {
    reportServerError(err, {
      route: "/api/admin/visitors/bulk-resend-confirmation",
      kind: "queue",
      extra: { op: "queue_batch" },
    });
    failedCount = jobs.length;
    queuedCount = 0;
  }

  const finalStatus = queuedCount === 0 ? "failed" : "processing";
  await admin
    .from("bulk_confirmation_resend_batch")
    .update({ queued_count: queuedCount, status: finalStatus })
    .eq("id", batchId);

  await supabase.from("activity_logs").insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    action: "bulk_confirmation_resend",
    target_table: "bulk_confirmation_resend_batch",
    target_id: batchId,
    details: {
      mode,
      recipient_count: jobs.length,
      queued_count: queuedCount,
      failed_to_queue: failedCount,
      resume_from_batch_id: sourceBatchId,
    },
  });

  const summary = await summarizeBulkResendBatch(admin, batchId);

  return NextResponse.json({
    ok: true,
    batchId,
    recipientCount: jobs.length,
    queuedCount,
    failedCount,
    status: finalStatus,
    summary,
  });
}
