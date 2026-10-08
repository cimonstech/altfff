import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCheckInAccess } from "@/lib/adminAuth";
import { escapeCheckInSearch } from "@/lib/visitorCheckIn";
import { ADMIN_RATE_LIMITS, checkAdminRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MIN_QUERY_LEN = 2;
const MAX_QUERY_LEN = 120;
const RESULT_CAP = 20;

export async function GET(request: Request) {
  const auth = await requireCheckInAccess();
  if ("error" in auth) return auth.error;

  const rate = await checkAdminRateLimit(
    request,
    auth.user.id,
    ADMIN_RATE_LIMITS.checkin,
    "admin/checkin-search",
  );
  if (!rate.success) {
    return NextResponse.json({ ok: false, error: RATE_LIMIT_ERROR_MESSAGE }, { status: 429 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < MIN_QUERY_LEN) {
    return NextResponse.json({ ok: false, error: "Type at least two characters." }, { status: 400 });
  }
  if (q.length > MAX_QUERY_LEN) {
    return NextResponse.json({ ok: false, error: "Search is too long." }, { status: 400 });
  }

  const term = escapeCheckInSearch(q);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("id, full_name, email, status, checked_in_at, checked_in_by_email")
    .eq("status", "confirmed")
    .eq("source", "pre_registered")
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
    .order("full_name", { ascending: true })
    .limit(RESULT_CAP);

  if (error) {
    console.error("Check-in visitor search failed:", error);
    return NextResponse.json({ ok: false, error: "Search failed. Try again." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    visitors: data ?? [],
  });
}
