import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminAuth";
import { publishToQueue } from "@/lib/qstash";
import { processRecipient, queueDelaySecondsForIndex } from "@/lib/communicationDelivery";
import {
  AUDIENCE_CONFIG,
  AUDIENCE_TYPES,
  getMergeFieldValues,
  isValidCustomRecipient,
  type AudienceType,
  type Channel,
  type CustomRecipient,
} from "@/lib/communications";
import { reportServerError } from "@/lib/sentryReport";
import { ADMIN_RATE_LIMITS, checkAdminRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Admin-sized tables only - a hard cap here is just a safety valve, not a
// real pagination limit (matches AdminDataTable's own 500-row cap logic).
const RECIPIENT_CAP = 2000;

async function requireCommunicationsAdmin(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth;

  const rate = await checkAdminRateLimit(
    request,
    auth.user.id,
    ADMIN_RATE_LIMITS.communicationsSend,
    "admin/communications/send",
  );
  if (!rate.success) {
    return { error: NextResponse.json({ ok: false, error: RATE_LIMIT_ERROR_MESSAGE }, { status: 429 }) };
  }

  const supabase = await createClient();
  return { user: auth.user, supabase };
}

type SendPayload = {
  audience?: unknown;
  status?: unknown;
  channel?: unknown;
  subject?: unknown;
  body?: unknown;
  /** Only used when audience === "custom" - raw entries from the compose
   * textarea, or handed off from a data table's row selection. Re-validated
   * here regardless of what the client already checked. */
  recipients?: unknown;
  /** Only used when audience === "custom" - "typed" or "preloaded", for
   * audience_filter's audit trail. Purely descriptive, not used for logic. */
  customSource?: unknown;
};

/** A recipient about to be inserted, with its merge-field values already
 * resolved - the one shape both the table-driven and custom-audience
 * branches converge on before the shared insert/send logic below. */
type ResolvedRecipient = {
  email: string | null;
  phone: string | null;
  /** Real name when known (audience rows / preloaded selection); null for
   * freeform Custom-typed addresses that genuinely have no name. */
  name: string | null;
  mergeFields: Record<string, string>;
};

export async function POST(request: Request) {
  const auth = await requireCommunicationsAdmin(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  let payload: SendPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const audience = typeof payload.audience === "string" ? payload.audience : "";
  const status = typeof payload.status === "string" ? payload.status : "all";
  const channel = typeof payload.channel === "string" ? payload.channel : "";
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const customSource = typeof payload.customSource === "string" ? payload.customSource : "typed";

  const isCustom = audience === "custom";
  if (!isCustom && !AUDIENCE_TYPES.includes(audience as AudienceType)) {
    return NextResponse.json({ ok: false, error: "Invalid audience." }, { status: 400 });
  }
  if (!["email", "sms", "both"].includes(channel)) {
    return NextResponse.json({ ok: false, error: "Invalid channel." }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ ok: false, error: "Message body is required." }, { status: 400 });
  }
  if ((channel === "email" || channel === "both") && !subject) {
    return NextResponse.json({ ok: false, error: "Subject is required when sending email." }, { status: 400 });
  }

  let resolvedRecipients: ResolvedRecipient[];
  let audienceFilter: Record<string, unknown>;

  if (isCustom) {
    // Never trust the client's own parsing/validation - re-check every
    // entry against the same loose format rules server-side. Anything
    // that fails is silently dropped (not sent to, not an error for the
    // whole batch) rather than rejecting the entire send over one bad line.
    const rawRecipients = Array.isArray(payload.recipients) ? (payload.recipients as unknown[]) : [];
    const validRecipients: CustomRecipient[] = rawRecipients
      .map((r): CustomRecipient => {
        const obj = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
        return {
          email: typeof obj.email === "string" ? obj.email.trim() : null,
          phone: typeof obj.phone === "string" ? obj.phone.trim() : null,
          name: typeof obj.name === "string" ? obj.name.trim() : null,
        };
      })
      .filter(isValidCustomRecipient)
      .slice(0, RECIPIENT_CAP);

    if (validRecipients.length === 0) {
      return NextResponse.json({ ok: false, error: "No valid recipients were provided." }, { status: 400 });
    }

    resolvedRecipients = validRecipients.map((r) => ({
      email: r.email,
      phone: r.phone,
      // Preloaded hand-offs carry a real name; freeform typed entries stay null.
      name: r.name && r.name.length > 0 ? r.name : null,
      // "name" is the only merge field a Custom recipient can ever have -
      // present for a preloaded (data-table) selection, absent for raw
      // typed/pasted addresses, which carry no name data at all.
      mergeFields: { name: r.name ?? "" },
    }));
    audienceFilter = { source: customSource === "preloaded" ? "preloaded" : "typed" };
  } else {
    const audienceType = audience as AudienceType;
    const config = AUDIENCE_CONFIG[audienceType];
    if (status !== "all" && !config.statuses.includes(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status filter." }, { status: 400 });
    }

    // Rebuilt server-side from the submitted filters, never trusting a
    // client-submitted recipient list - this is the only recipient list
    // that actually gets used.
    let query = supabase.from(config.table).select(config.selectColumns).limit(RECIPIENT_CAP);
    if (status !== "all") query = query.eq("status", status);
    const { data: recipientsData, error: recipientsError } = await query;
    // config.selectColumns is a plain string, not a literal template, so
    // supabase-js can't statically infer row shape from it - cast through
    // unknown once here rather than at every access site below.
    const recipients = (recipientsData ?? null) as unknown as Record<string, unknown>[] | null;

    if (recipientsError) {
      console.error("Failed to load recipients for communication send:", recipientsError);
      reportServerError(recipientsError, {
        route: "/api/admin/communications/send",
        kind: "db",
        extra: { op: "load_recipients", audience },
      });
      return NextResponse.json({ ok: false, error: "Failed to load recipients." }, { status: 500 });
    }
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ ok: false, error: "No recipients match the selected filters." }, { status: 400 });
    }

    resolvedRecipients = recipients.map((r) => {
      const mergeFields = getMergeFieldValues(audienceType, r);
      const name = mergeFields.name.trim().length > 0 ? mergeFields.name.trim() : null;
      return {
        email: (r.email as string | null | undefined) ?? null,
        phone: (r.phone as string | null | undefined) ?? null,
        name,
        mergeFields,
      };
    });
    audienceFilter = { status };
  }

  const { data: log, error: logError } = await supabase
    .from("communication_log")
    .insert({
      channel,
      audience_type: audience,
      audience_filter: audienceFilter,
      subject: channel === "sms" ? null : subject,
      body,
      recipient_count: resolvedRecipients.length,
      status: "queued",
      sent_by: user.id,
      // Snapshot at send time - survives later admin deletion (migration 0005).
      sent_by_email: user.email ?? null,
    })
    .select("id")
    .single();

  if (logError || !log) {
    console.error("Failed to insert communication_log:", logError);
    reportServerError(logError ?? new Error("communication_log insert returned no row"), {
      route: "/api/admin/communications/send",
      kind: "db",
      extra: { op: "insert_log" },
    });
    return NextResponse.json({ ok: false, error: "Failed to create communication record." }, { status: 500 });
  }

  const { data: insertedRecipients, error: recipientsInsertError } = await supabase
    .from("communication_recipients")
    .insert(
      resolvedRecipients.map((r) => ({
        communication_id: log.id,
        recipient_email: r.email,
        recipient_phone: r.phone,
        recipient_name: r.name,
        status: "pending",
      })),
    )
    .select("id");

  if (recipientsInsertError || !insertedRecipients || insertedRecipients.length !== resolvedRecipients.length) {
    console.error("Failed to insert communication_recipients:", recipientsInsertError);
    reportServerError(recipientsInsertError ?? new Error("recipient insert count mismatch"), {
      route: "/api/admin/communications/send",
      kind: "db",
      extra: { op: "insert_recipients" },
    });
    return NextResponse.json({ ok: false, error: "Failed to create recipient records." }, { status: 500 });
  }

  // Postgres/PostgREST bulk inserts return rows in the same order they were
  // submitted, so this positional zip is safe - it's how each recipient's
  // merge-field values are matched back to its inserted DB row.
  const jobs = resolvedRecipients.map((r, i) => ({
    recipientId: insertedRecipients[i].id as string,
    mergeFields: r.mergeFields,
  }));

  if (jobs.length === 1) {
    await processRecipient(supabase, {
      communicationId: log.id,
      recipientId: jobs[0].recipientId,
      channel: channel as Channel,
      subject: channel === "sms" ? null : subject,
      body,
      mergeFields: jobs[0].mergeFields,
    });

    const { data: finalLog } = await supabase.from("communication_log").select("*").eq("id", log.id).single();
    return NextResponse.json({ ok: true, communicationId: log.id, status: finalLog?.status ?? "unknown" });
  }

  // Promise.allSettled, not Promise.all - a single rejected publish (QStash
  // unreachable, a transient failure, a bad payload) must not abort
  // tracking of every other recipient in the batch. Each settled result is
  // handled individually below: a failed publish never even reached the
  // queue, so its row is marked 'failed' with the real reason immediately
  // rather than left stuck at 'pending' forever with the worker never
  // going to run for it. The whole step is also wrapped in try/catch as an
  // outer safety net - whatever happens here, this route always returns a
  // clean JSON response, never an uncaught crash.
  let queuedCount = 0;
  let failedCount = 0;
  const sendsEmail = channel === "email" || channel === "both";
  try {
    const results = await Promise.allSettled(
      jobs.map((job, index) =>
        publishToQueue(
          "/api/admin/communications/process-recipient",
          {
            communicationId: log.id,
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
      reportServerError(new Error(`Failed to queue ${failedJobs.length} of ${jobs.length} recipients`), {
        route: "/api/admin/communications/send",
        kind: "queue",
        extra: { failedCount: failedJobs.length, total: jobs.length },
      });
      await Promise.all(
        failedJobs.map(({ job, result }) => {
          const reason = result.status === "rejected" ? result.reason : undefined;
          const errorMessage = reason instanceof Error ? reason.message : String(reason ?? "Failed to queue.");
          return supabase
            .from("communication_recipients")
            .update({ status: "failed", sent_at: new Date().toISOString(), error_message: errorMessage })
            .eq("id", job.recipientId);
        }),
      );
    }
  } catch (err) {
    // Something unexpected beyond the individual publishes themselves -
    // still no idea which, if any, actually queued, so treat the whole
    // batch as failed-to-queue rather than guessing.
    console.error("Unexpected error while queuing communication:", err);
    reportServerError(err, {
      route: "/api/admin/communications/send",
      kind: "queue",
      extra: { op: "queue_batch" },
    });
    failedCount = jobs.length;
    queuedCount = 0;
    await supabase
      .from("communication_recipients")
      .update({
        status: "failed",
        sent_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : "Failed to queue.",
      })
      .eq("communication_id", log.id)
      .eq("status", "pending");
  }

  const finalStatus = queuedCount === 0 ? "failed" : failedCount === 0 ? "sending" : "partially_failed";
  const { error: statusUpdateError } = await supabase
    .from("communication_log")
    .update({ status: finalStatus })
    .eq("id", log.id);
  if (statusUpdateError) {
    console.error("Failed to update communication_log status after queuing:", statusUpdateError);
    reportServerError(statusUpdateError, {
      route: "/api/admin/communications/send",
      kind: "db",
      extra: { op: "update_status" },
    });
  }

  return NextResponse.json({
    ok: true,
    communicationId: log.id,
    status: finalStatus,
    recipientCount: jobs.length,
    queuedCount,
    failedCount,
  });
}
