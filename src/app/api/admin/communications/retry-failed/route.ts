import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminAuth";
import { publishToQueue } from "@/lib/qstash";
import {
  processRecipient,
  queueDelaySecondsForIndex,
  resolveRetryMergeFields,
} from "@/lib/communicationDelivery";
import type { Channel } from "@/lib/communications";
import { reportServerError } from "@/lib/sentryReport";
import { ADMIN_RATE_LIMITS, checkAdminRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";

export const runtime = "nodejs";

type RetryPayload = {
  communicationId?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const rate = await checkAdminRateLimit(
    request,
    auth.user.id,
    ADMIN_RATE_LIMITS.communicationsSend,
    "admin/communications/retry-failed",
  );
  if (!rate.success) {
    return NextResponse.json({ ok: false, error: RATE_LIMIT_ERROR_MESSAGE }, { status: 429 });
  }

  let payload: RetryPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const communicationId = typeof payload.communicationId === "string" ? payload.communicationId : "";
  if (!communicationId) {
    return NextResponse.json({ ok: false, error: "communicationId is required." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: log, error: logError } = await supabase
    .from("communication_log")
    .select("id, channel, subject, body, audience_type")
    .eq("id", communicationId)
    .single();

  if (logError || !log) {
    return NextResponse.json({ ok: false, error: "Communication not found." }, { status: 404 });
  }

  const { data: failedRecipients, error: failedError } = await supabase
    .from("communication_recipients")
    .select("id, recipient_email, recipient_phone, recipient_name")
    .eq("communication_id", communicationId)
    .eq("status", "failed");

  if (failedError) {
    reportServerError(failedError, {
      route: "/api/admin/communications/retry-failed",
      kind: "db",
      extra: { op: "load_failed_recipients" },
    });
    return NextResponse.json({ ok: false, error: "Failed to load failed recipients." }, { status: 500 });
  }

  if (!failedRecipients || failedRecipients.length === 0) {
    return NextResponse.json({ ok: false, error: "No failed recipients to retry." }, { status: 400 });
  }

  const channel = log.channel as Channel;
  const sendsEmail = channel === "email" || channel === "both";

  const jobs = await Promise.all(
    failedRecipients.map(async (recipient) => ({
      recipientId: recipient.id as string,
      mergeFields: await resolveRetryMergeFields(supabase, log.audience_type, recipient),
    })),
  );

  const { error: resetError } = await supabase
    .from("communication_recipients")
    .update({ status: "pending", sent_at: null, error_message: null })
    .eq("communication_id", communicationId)
    .eq("status", "failed");

  if (resetError) {
    reportServerError(resetError, {
      route: "/api/admin/communications/retry-failed",
      kind: "db",
      extra: { op: "reset_failed_recipients" },
    });
    return NextResponse.json({ ok: false, error: "Failed to reset failed recipients." }, { status: 500 });
  }

  await supabase.from("communication_log").update({ status: "sending" }).eq("id", communicationId);

  if (jobs.length === 1) {
    await processRecipient(supabase, {
      communicationId,
      recipientId: jobs[0].recipientId,
      channel,
      subject: log.subject,
      body: log.body,
      mergeFields: jobs[0].mergeFields,
    });

    const { data: finalLog } = await supabase.from("communication_log").select("status").eq("id", communicationId).single();
    return NextResponse.json({
      ok: true,
      communicationId,
      retriedCount: 1,
      status: finalLog?.status ?? "unknown",
    });
  }

  let queuedCount = 0;
  let failedCount = 0;

  try {
    const results = await Promise.allSettled(
      jobs.map((job, index) =>
        publishToQueue(
          "/api/admin/communications/process-recipient",
          {
            communicationId,
            recipientId: job.recipientId,
            mergeFields: job.mergeFields,
          },
          { delaySeconds: queueDelaySecondsForIndex(index, sendsEmail) },
        ),
      ),
    );

    const failedJobs = jobs
      .map((job, i) => ({ job, result: results[i] }))
      .filter(({ result }) => result.status === "rejected");

    queuedCount = jobs.length - failedJobs.length;
    failedCount = failedJobs.length;

    if (failedJobs.length > 0) {
      await Promise.all(
        failedJobs.map(({ job, result }) => {
          const reason = result.status === "rejected" ? result.reason : undefined;
          const errorMessage = reason instanceof Error ? reason.message : String(reason ?? "Failed to queue retry.");
          return supabase
            .from("communication_recipients")
            .update({ status: "failed", sent_at: new Date().toISOString(), error_message: errorMessage })
            .eq("id", job.recipientId);
        }),
      );
    }
  } catch (err) {
    reportServerError(err, {
      route: "/api/admin/communications/retry-failed",
      kind: "queue",
      extra: { op: "queue_retry_batch" },
    });
    failedCount = jobs.length;
    queuedCount = 0;
    await supabase
      .from("communication_recipients")
      .update({
        status: "failed",
        sent_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : "Failed to queue retry.",
      })
      .eq("communication_id", communicationId)
      .eq("status", "pending");
  }

  const finalStatus = queuedCount === 0 ? "failed" : failedCount === 0 ? "sending" : "partially_failed";
  await supabase.from("communication_log").update({ status: finalStatus }).eq("id", communicationId);

  return NextResponse.json({
    ok: true,
    communicationId,
    retriedCount: jobs.length,
    queuedCount,
    failedCount,
    status: finalStatus,
  });
}
