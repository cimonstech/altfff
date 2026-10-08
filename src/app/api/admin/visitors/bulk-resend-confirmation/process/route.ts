import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { processBulkConfirmationResendJob } from "@/lib/bulkConfirmationResend";
import { getSiteUrl } from "@/lib/siteUrl";
import { reportServerError } from "@/lib/sentryReport";

export const runtime = "nodejs";

type WorkerPayload = {
  batchId?: unknown;
  visitorId?: unknown;
};

async function handler(request: Request) {
  let payload: WorkerPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload." });
  }

  const batchId = typeof payload.batchId === "string" ? payload.batchId : "";
  const visitorId = typeof payload.visitorId === "string" ? payload.visitorId : "";

  if (!batchId || !visitorId) {
    return NextResponse.json({ ok: false, error: "batchId and visitorId are required." });
  }

  const supabase = createAdminClient();

  try {
    await processBulkConfirmationResendJob(supabase, batchId, visitorId);
  } catch (err) {
    console.error("bulk-resend process: unexpected failure", err);
    reportServerError(err, {
      route: "/api/admin/visitors/bulk-resend-confirmation/process",
      kind: "worker",
      extra: { op: "process_bulk_resend", batch_id: batchId, visitor_id: visitorId },
    });
    return NextResponse.json({ ok: false, error: "Processing failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

let cachedVerifiedHandler: ReturnType<typeof verifySignatureAppRouter> | null = null;

function getVerifiedHandler() {
  if (!cachedVerifiedHandler) {
    cachedVerifiedHandler = verifySignatureAppRouter(handler, {
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
      url: `${getSiteUrl()}/api/admin/visitors/bulk-resend-confirmation/process`,
    });
  }
  return cachedVerifiedHandler;
}

export async function POST(request: Request) {
  try {
    return await getVerifiedHandler()(request);
  } catch (err) {
    console.error("bulk-resend process: QStash signature verification is not configured", err);
    reportServerError(err, {
      route: "/api/admin/visitors/bulk-resend-confirmation/process",
      kind: "config",
      extra: { op: "qstash_verify" },
    });
    return NextResponse.json({ ok: false, error: "QStash is not configured." }, { status: 500 });
  }
}
