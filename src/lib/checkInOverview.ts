import type { SupabaseClient } from "@supabase/supabase-js";

export type CheckInOverviewCounts = {
  preRegisteredConfirmed: number;
  checkedIn: number;
  walkIns: number;
};

export async function fetchCheckInOverviewCounts(
  supabase: SupabaseClient,
): Promise<CheckInOverviewCounts> {
  const [preRegistered, checkedIn, walkIns] = await Promise.all([
    supabase
      .from("visitor_registrations")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")
      .eq("source", "pre_registered"),
    supabase
      .from("visitor_registrations")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")
      .eq("source", "pre_registered")
      .not("checked_in_at", "is", null),
    supabase
      .from("visitor_registrations")
      .select("*", { count: "exact", head: true })
      .eq("source", "walk_in"),
  ]);

  if (preRegistered.error || checkedIn.error || walkIns.error) {
    console.error("[CheckInOverview] count query failed", {
      preRegistered: preRegistered.error,
      checkedIn: checkedIn.error,
      walkIns: walkIns.error,
    });
  }

  return {
    preRegisteredConfirmed: preRegistered.count ?? 0,
    checkedIn: checkedIn.count ?? 0,
    walkIns: walkIns.count ?? 0,
  };
}
