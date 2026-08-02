import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const supabase = await createClient();

  const [{ count: approved }, { count: checkedIn }] = await Promise.all([
    supabase
      .from("visitor_registrations")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("visitor_registrations")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")
      .not("checked_in_at", "is", null),
  ]);

  return NextResponse.json({
    ok: true,
    approved: approved ?? 0,
    checkedIn: checkedIn ?? 0,
  });
}
