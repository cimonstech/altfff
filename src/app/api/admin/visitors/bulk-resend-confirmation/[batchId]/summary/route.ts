import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";
import { summarizeBulkResendBatch } from "@/lib/bulkConfirmationResend";
import { reportServerError } from "@/lib/sentryReport";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { batchId } = await context.params;
  if (!batchId) {
    return NextResponse.json({ ok: false, error: "batchId is required." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const summary = await summarizeBulkResendBatch(admin, batchId);
    if (!summary) {
      return NextResponse.json({ ok: false, error: "Batch not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    reportServerError(err, {
      route: "/api/admin/visitors/bulk-resend-confirmation/[batchId]/summary",
      kind: "db",
      extra: { op: "summarize_batch", batch_id: batchId },
    });
    return NextResponse.json({ ok: false, error: "Failed to load batch summary." }, { status: 500 });
  }
}
