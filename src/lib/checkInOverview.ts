import type { SupabaseClient } from "@supabase/supabase-js";

export type CheckInOverviewCounts = {
  preRegisteredConfirmed: number;
  checkedIn: number;
  walkIns: number;
};

export type CheckInOverviewListKind = "preRegistered" | "checkedIn" | "walkIns";

export const CHECKIN_OVERVIEW_LIST_SLUGS: Record<CheckInOverviewListKind, string> = {
  preRegistered: "pre-registered",
  checkedIn: "checked-in",
  walkIns: "walk-ins",
};

export function checkInOverviewListHref(kind: CheckInOverviewListKind): string {
  return `/admin/checkin-overview/${CHECKIN_OVERVIEW_LIST_SLUGS[kind]}`;
}

export function parseCheckInOverviewListSlug(slug: string): CheckInOverviewListKind | null {
  const entry = Object.entries(CHECKIN_OVERVIEW_LIST_SLUGS).find(([, value]) => value === slug);
  return (entry?.[0] as CheckInOverviewListKind | undefined) ?? null;
}

export type CheckInOverviewListRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  checked_in_at: string | null;
  checked_in_by_email: string | null;
  created_at: string;
};

const LIST_SELECT =
  "id, full_name, email, phone, checked_in_at, checked_in_by_email, created_at";

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

export async function fetchCheckInOverviewList(
  supabase: SupabaseClient,
  kind: CheckInOverviewListKind,
): Promise<CheckInOverviewListRow[]> {
  if (kind === "walkIns") {
    const { data, error } = await supabase
      .from("visitor_registrations")
      .select(LIST_SELECT)
      .eq("source", "walk_in")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[CheckInOverview] walk-in list query failed", error);
      return [];
    }
    return data ?? [];
  }

  if (kind === "checkedIn") {
    const { data, error } = await supabase
      .from("visitor_registrations")
      .select(LIST_SELECT)
      .eq("status", "confirmed")
      .eq("source", "pre_registered")
      .not("checked_in_at", "is", null)
      .order("checked_in_at", { ascending: false });
    if (error) {
      console.error("[CheckInOverview] checked-in list query failed", error);
      return [];
    }
    return data ?? [];
  }

  const { data, error } = await supabase
    .from("visitor_registrations")
    .select(LIST_SELECT)
    .eq("status", "confirmed")
    .eq("source", "pre_registered")
    .order("full_name", { ascending: true });
  if (error) {
    console.error("[CheckInOverview] pre-registered list query failed", error);
    return [];
  }
  return data ?? [];
}

export function checkInOverviewListTitle(kind: CheckInOverviewListKind): string {
  switch (kind) {
    case "preRegistered":
      return "Confirmed pre-registered";
    case "checkedIn":
      return "Checked in so far";
    case "walkIns":
      return "Walk-in registrations";
  }
}
