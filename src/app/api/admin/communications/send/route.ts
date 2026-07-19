import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publishToQueue } from "@/lib/qstash";
import { processRecipient } from "@/lib/communicationDelivery";
import {
  AUDIENCE_CONFIG,
  AUDIENCE_TYPES,
  getMergeFieldValues,
  type AudienceType,
  type Channel,
} from "@/lib/communications";

export const runtime = "nodejs";

// Admin-sized tables only - a hard cap here is just a safety valve, not a
// real pagination limit (matches AdminDataTable's own 500-row cap logic).
const RECIPIENT_CAP = 2000;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }) };

  const { data: profile } = await supabase.from("admin_profiles").select("id").eq("id", user.id).single();
  if (!profile) return { error: NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 }) };

  return { user, supabase };
}

type SendPayload = {
  audience?: unknown;
  status?: unknown;
  channel?: unknown;
  subject?: unknown;
  body?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
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

  if (!AUDIENCE_TYPES.includes(audience as AudienceType)) {
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

  const audienceType = audience as AudienceType;
  const config = AUDIENCE_CONFIG[audienceType];
  if (status !== "all" && !config.statuses.includes(status)) {
    return NextResponse.json({ ok: false, error: "Invalid status filter." }, { status: 400 });
  }

  // Rebuilt server-side from the submitted filters, never trusting a
  // client-submitted recipient list - this is the only recipient list that
  // actually gets used.
  let query = supabase.from(config.table).select(config.selectColumns).limit(RECIPIENT_CAP);
  if (status !== "all") query = query.eq("status", status);
  const { data: recipientsData, error: recipientsError } = await query;
  // config.selectColumns is a plain string, not a literal template, so
  // supabase-js can't statically infer row shape from it - cast through
  // unknown once here rather than at every access site below.
  const recipients = (recipientsData ?? null) as unknown as Record<string, unknown>[] | null;

  if (recipientsError) {
    console.error("Failed to load recipients for communication send:", recipientsError);
    return NextResponse.json({ ok: false, error: "Failed to load recipients." }, { status: 500 });
  }
  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ ok: false, error: "No recipients match the selected filters." }, { status: 400 });
  }

  const { data: log, error: logError } = await supabase
    .from("communication_log")
    .insert({
      channel,
      audience_type: audienceType,
      audience_filter: { status },
      subject: channel === "sms" ? null : subject,
      body,
      recipient_count: recipients.length,
      status: "queued",
      sent_by: user.id,
    })
    .select("id")
    .single();

  if (logError || !log) {
    console.error("Failed to insert communication_log:", logError);
    return NextResponse.json({ ok: false, error: "Failed to create communication record." }, { status: 500 });
  }

  const { data: insertedRecipients, error: recipientsInsertError } = await supabase
    .from("communication_recipients")
    .insert(
      recipients.map((r) => ({
        communication_id: log.id,
        recipient_email: r.email ?? null,
        recipient_phone: r.phone ?? null,
        status: "pending",
      })),
    )
    .select("id");

  if (recipientsInsertError || !insertedRecipients || insertedRecipients.length !== recipients.length) {
    console.error("Failed to insert communication_recipients:", recipientsInsertError);
    return NextResponse.json({ ok: false, error: "Failed to create recipient records." }, { status: 500 });
  }

  // Postgres/PostgREST bulk inserts return rows in the same order they were
  // submitted, so this positional zip is safe - it's how the recipient's
  // merge-field source row is matched back to its inserted DB row.
  const jobs = recipients.map((r, i) => ({
    recipientId: insertedRecipients[i].id as string,
    mergeFields: getMergeFieldValues(audienceType, r),
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

  await Promise.all(
    jobs.map((job) =>
      publishToQueue("/api/admin/communications/process-recipient", {
        communicationId: log.id,
        recipientId: job.recipientId,
        mergeFields: job.mergeFields,
      }),
    ),
  );

  return NextResponse.json({ ok: true, communicationId: log.id, status: "queued", recipientCount: jobs.length });
}
