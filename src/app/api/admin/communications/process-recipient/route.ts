import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { processRecipient } from "@/lib/communicationDelivery";
import type { Channel } from "@/lib/communications";

export const runtime = "nodejs";

type WorkerPayload = {
  communicationId?: unknown;
  recipientId?: unknown;
  mergeFields?: unknown;
};

async function handler(request: Request) {
  let payload: WorkerPayload;
  try {
    payload = await request.json();
  } catch {
    // Malformed body isn't retryable - ack so QStash doesn't keep retrying it.
    return NextResponse.json({ ok: false, error: "Invalid payload." });
  }

  const communicationId = typeof payload.communicationId === "string" ? payload.communicationId : "";
  const recipientId = typeof payload.recipientId === "string" ? payload.recipientId : "";
  const mergeFields =
    payload.mergeFields && typeof payload.mergeFields === "object"
      ? (payload.mergeFields as Record<string, string>)
      : {};

  if (!communicationId || !recipientId) {
    return NextResponse.json({ ok: false, error: "communicationId and recipientId are required." });
  }

  // No user session exists in this context (QStash calls this server-to-
  // server) - the service-role client is the deliberate exception the
  // .env.example comment on SUPABASE_SERVICE_ROLE_KEY already calls out for
  // exactly this job.
  const supabase = createAdminClient();

  const { data: log, error: logError } = await supabase
    .from("communication_log")
    .select("channel, subject, body")
    .eq("id", communicationId)
    .single();

  if (logError || !log) {
    console.error("process-recipient: parent communication_log not found", communicationId, logError);
    // Nothing retrying this will fix - ack rather than let QStash retry forever.
    return NextResponse.json({ ok: false, error: "Communication not found." });
  }

  await processRecipient(supabase, {
    communicationId,
    recipientId,
    channel: log.channel as Channel,
    subject: log.subject,
    body: log.body,
    mergeFields,
  });

  return NextResponse.json({ ok: true });
}

export const POST = verifySignatureAppRouter(handler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  url: `${process.env.SITE_URL}/api/admin/communications/process-recipient`,
});
