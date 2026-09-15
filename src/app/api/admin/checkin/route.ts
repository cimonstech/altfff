import { after, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCheckInAccess } from "@/lib/adminAuth";
import { normalizeCheckInToken } from "@/lib/visitorVetting";
import {
  isVisitorId,
  performVisitorCheckIn,
  sendCheckInWelcomeSms,
  type CheckInOutcome,
  type CheckInVisitor,
} from "@/lib/visitorCheckIn";
import { ADMIN_RATE_LIMITS, checkAdminRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";

export const runtime = "nodejs";

const TOKEN_MAX_LEN = 128;
const VISITOR_CHECKIN_SELECT =
  "id, email, full_name, phone, status, source, checked_in_at, checked_in_by_email";

type CheckInBody = { token?: unknown; visitorId?: unknown };

function jsonCheckIn(outcome: CheckInOutcome, visitor?: CheckInVisitor) {
  if (visitor && outcome.body.ok && outcome.body.result === "checked_in") {
    after(() => sendCheckInWelcomeSms(visitor));
  }
  return NextResponse.json(outcome.body, { status: outcome.httpStatus });
}

export async function POST(request: Request) {
  const auth = await requireCheckInAccess();
  if ("error" in auth) return auth.error;

  const rate = await checkAdminRateLimit(
    request,
    auth.user.id,
    ADMIN_RATE_LIMITS.checkin,
    "admin/checkin",
  );
  if (!rate.success) {
    return NextResponse.json({ ok: false, result: "error", message: RATE_LIMIT_ERROR_MESSAGE }, { status: 429 });
  }

  let body: CheckInBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, result: "invalid", message: "Invalid request body." }, { status: 400 });
  }

  const rawVisitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";
  const rawToken = typeof body.token === "string" ? body.token : "";

  if (rawVisitorId && rawToken.trim()) {
    return NextResponse.json(
      { ok: false, result: "invalid", message: "Send a QR token or a visitor id, not both." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  if (rawVisitorId) {
    if (!isVisitorId(rawVisitorId)) {
      return NextResponse.json({ ok: false, result: "invalid", message: "Unrecognised visitor." });
    }

    const { data: visitor, error: fetchError } = await supabase
      .from("visitor_registrations")
      .select(VISITOR_CHECKIN_SELECT)
      .eq("id", rawVisitorId)
      .maybeSingle();

    if (fetchError) {
      console.error("Check-in lookup by id failed:", fetchError);
      return NextResponse.json({ ok: false, result: "error", message: "Lookup failed. Try again." }, { status: 500 });
    }

    if (!visitor) {
      return NextResponse.json({ ok: false, result: "invalid", message: "Unrecognised visitor." });
    }

    const row = visitor as CheckInVisitor;
    if (row.source === "walk_in") {
      return NextResponse.json({
        ok: false,
        result: "invalid",
        message: "Walk-in registrations are not checked in through this lookup.",
        name: row.full_name || row.email,
      });
    }

    const outcome = await performVisitorCheckIn(supabase, auth.user, row, "manual_lookup");
    return jsonCheckIn(outcome, row);
  }

  const token = normalizeCheckInToken(rawToken);
  if (!token || token.length > TOKEN_MAX_LEN) {
    return NextResponse.json({
      ok: false,
      result: "invalid",
      message: "Unrecognised QR code.",
    });
  }

  const { data: visitor, error: fetchError } = await supabase
    .from("visitor_registrations")
    .select(VISITOR_CHECKIN_SELECT)
    .eq("qr_token", token)
    .maybeSingle();

  if (fetchError) {
    console.error("Check-in lookup failed:", fetchError);
    return NextResponse.json({ ok: false, result: "error", message: "Lookup failed. Try again." }, { status: 500 });
  }

  if (!visitor) {
    return NextResponse.json({
      ok: false,
      result: "invalid",
      message: "Unrecognised QR code.",
    });
  }

  const row = visitor as CheckInVisitor;
  const outcome = await performVisitorCheckIn(supabase, auth.user, row, "qr");
  return jsonCheckIn(outcome, row);
}
