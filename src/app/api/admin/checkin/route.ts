import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminAuth";
import { formatCheckInTime, normalizeCheckInToken, visitorDisplayName } from "@/lib/visitorVetting";

export const runtime = "nodejs";

const TOKEN_MAX_LEN = 128;

type CheckInBody = { token?: unknown };

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: CheckInBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, result: "invalid", message: "Invalid request body." }, { status: 400 });
  }

  const token = normalizeCheckInToken(typeof body.token === "string" ? body.token : "");
  if (!token || token.length > TOKEN_MAX_LEN) {
    return NextResponse.json({
      ok: false,
      result: "invalid",
      message: "Unrecognised QR code.",
    });
  }

  const supabase = await createClient();

  const { data: visitor, error: fetchError } = await supabase
    .from("visitor_registrations")
    .select("id, email, full_name, status, checked_in_at, checked_in_by_email")
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

  const name = visitorDisplayName(visitor);

  if (visitor.status === "declined") {
    return NextResponse.json({
      ok: false,
      result: "declined",
      message: "This registration was declined.",
      name,
    });
  }

  if (visitor.status === "registered") {
    return NextResponse.json({
      ok: false,
      result: "pending",
      message: "Not approved yet - pending admin review.",
      name,
    });
  }

  if (visitor.status === "cancelled") {
    return NextResponse.json({
      ok: false,
      result: "cancelled",
      message: "This registration was cancelled.",
      name,
    });
  }

  if (visitor.checked_in_at) {
    return NextResponse.json({
      ok: false,
      result: "already_checked_in",
      message: `Already checked in at ${formatCheckInTime(visitor.checked_in_at)}.`,
      name,
      checkedInAt: visitor.checked_in_at,
      checkedInBy: visitor.checked_in_by_email,
    });
  }

  if (visitor.status !== "confirmed") {
    return NextResponse.json({
      ok: false,
      result: "invalid",
      message: "This QR code cannot be used for check-in.",
      name,
    });
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("visitor_registrations")
    .update({
      checked_in_at: now,
      checked_in_by: auth.user.id,
      checked_in_by_email: auth.user.email,
    })
    .eq("id", visitor.id)
    .eq("status", "confirmed")
    .is("checked_in_at", null)
    .select("id, full_name, email, checked_in_at")
    .single();

  if (updateError || !updated) {
    // Race: another scan may have won - re-fetch for already-checked-in message.
    const { data: again } = await supabase
      .from("visitor_registrations")
      .select("full_name, email, checked_in_at, checked_in_by_email")
      .eq("id", visitor.id)
      .single();
    if (again?.checked_in_at) {
      return NextResponse.json({
        ok: false,
        result: "already_checked_in",
        message: `Already checked in at ${formatCheckInTime(again.checked_in_at)}.`,
        name: visitorDisplayName(again),
        checkedInAt: again.checked_in_at,
        checkedInBy: again.checked_in_by_email,
      });
    }
    console.error("Check-in update failed:", updateError);
    return NextResponse.json({ ok: false, result: "error", message: "Check-in failed. Try again." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    result: "checked_in",
    message: "Checked in successfully.",
    name: visitorDisplayName(updated),
    checkedInAt: updated.checked_in_at,
  });
}
