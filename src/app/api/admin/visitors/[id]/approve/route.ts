import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
  generateQrToken,
  sendVisitorApprovedEmail,
  type VisitorRow,
} from "@/lib/visitorVetting";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("visitor_registrations")
    .select("id, email, full_name, status, qr_token")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ ok: false, error: "Visitor not found." }, { status: 404 });
  }

  if (existing.status !== "registered") {
    return NextResponse.json(
      { ok: false, error: `Cannot approve — current status is "${existing.status}".` },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  // One approved registration → exactly one qr_token → exactly one check-in,
  // regardless of number_attending (informational only; multi-person codes would
  // need explicit future design, not inferred from that field).
  const qrToken = generateQrToken();

  const { data: updated, error: updateError } = await supabase
    .from("visitor_registrations")
    .update({
      status: "confirmed",
      qr_token: qrToken,
      qr_issued_at: now,
      status_updated_at: now,
    })
    .eq("id", id)
    .eq("status", "registered")
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("Visitor approve update failed:", updateError);
    return NextResponse.json({ ok: false, error: "Failed to approve visitor." }, { status: 500 });
  }

  const visitor = updated as VisitorRow;
  const emailSent = await sendVisitorApprovedEmail(visitor, qrToken);

  return NextResponse.json({
    ok: true,
    row: updated,
    emailSent,
    warning: emailSent ? undefined : "Approved, but the QR email could not be sent — check Resend logs.",
  });
}
