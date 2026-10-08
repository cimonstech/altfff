import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminAuth";
import { reportServerError } from "@/lib/sentryReport";
import {
  resolveVisitorRouteId,
  resendVisitorConfirmationEmail,
  type VisitorRow,
} from "@/lib/visitorVetting";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const id = await resolveVisitorRouteId(request, context.params);
  if (!id) {
    return NextResponse.json({ ok: false, error: "Visitor not found." }, { status: 404 });
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("visitor_registrations")
    .select("id, email, full_name, status, qr_token, qr_issued_at, checked_in_at, checked_in_by_email, source")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("Visitor resend-confirmation lookup failed:", fetchError);
    reportServerError(fetchError, {
      route: "/api/admin/visitors/[id]/resend-confirmation",
      kind: "admin",
      extra: { op: "load_visitor", visitor_id: id },
    });
    return NextResponse.json({ ok: false, error: "Failed to load visitor." }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Visitor not found." }, { status: 404 });
  }

  if (existing.status !== "confirmed") {
    return NextResponse.json(
      { ok: false, error: `Cannot resend confirmation - current status is "${existing.status}".` },
      { status: 409 },
    );
  }

  const qrToken = typeof existing.qr_token === "string" ? existing.qr_token.trim() : "";
  if (!qrToken) {
    return NextResponse.json(
      { ok: false, error: "This visitor has no QR code on file - nothing to resend." },
      { status: 409 },
    );
  }

  const visitor = existing as VisitorRow;
  const emailSent = await resendVisitorConfirmationEmail(visitor);

  const { error: logError } = await supabase.from("activity_logs").insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    action: "visitor_confirmation_resent",
    target_table: "visitor_registrations",
    target_id: id,
    details: {
      email: visitor.email,
      name: visitor.full_name,
      email_sent: emailSent,
    },
  });
  if (logError) {
    console.error("Failed to log visitor confirmation resend:", logError);
    reportServerError(logError, {
      route: "/api/admin/visitors/[id]/resend-confirmation",
      kind: "admin",
      extra: { op: "activity_log", visitor_id: id },
    });
  }

  return NextResponse.json({
    ok: true,
    row: existing,
    emailSent,
    warning: emailSent
      ? undefined
      : "Resend failed - the confirmation email could not be sent. Check Resend logs.",
  });
}
