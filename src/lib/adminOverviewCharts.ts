import type { SupabaseClient } from "@supabase/supabase-js";
import { EVENT } from "@/lib/constants";
import { VISITOR_INTERESTS } from "@/lib/visitorInterests";

export type ChartCountRow = {
  key: string;
  label: string;
  value: number;
};

export type CheckInProgressPoint = {
  /** ISO timestamp for sorting / tooltips */
  time: string;
  /** Short x-axis label */
  label: string;
  cumulative: number;
};

const COUNTRY_TOP_N = 8;

function countByField(rows: { field: string | null }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row.field?.trim();
    const key = raw && raw.length > 0 ? raw : "__empty__";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function eventDayStartIso(): string {
  return `${EVENT.startDate}T09:00:00.000Z`;
}

function formatChartTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export async function fetchCheckInProgressSeries(
  supabase: SupabaseClient,
): Promise<CheckInProgressPoint[]> {
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("checked_in_at")
    .eq("source", "pre_registered")
    .eq("status", "confirmed")
    .not("checked_in_at", "is", null)
    .order("checked_in_at", { ascending: true });

  if (error) {
    console.error("[AdminOverviewCharts] check-in progress query failed", error);
  }

  const checkIns = (data ?? []).filter(
    (row): row is { checked_in_at: string } => typeof row.checked_in_at === "string",
  );

  const start: CheckInProgressPoint = {
    time: eventDayStartIso(),
    label: "Doors open",
    cumulative: 0,
  };

  if (checkIns.length === 0) {
    const now = new Date().toISOString();
    return [
      start,
      {
        time: now,
        label: formatChartTime(now),
        cumulative: 0,
      },
    ];
  }

  let cumulative = 0;
  const points: CheckInProgressPoint[] = [start];
  for (const row of checkIns) {
    cumulative += 1;
    points.push({
      time: row.checked_in_at,
      label: formatChartTime(row.checked_in_at),
      cumulative,
    });
  }
  return points;
}

export async function fetchVisitorInterestBreakdown(
  supabase: SupabaseClient,
): Promise<ChartCountRow[]> {
  const { data, error } = await supabase.from("visitor_registrations").select("interest");
  if (error) {
    console.error("[AdminOverviewCharts] visitor interest query failed", error);
    return VISITOR_INTERESTS.map((item) => ({ key: item.value, label: item.label, value: 0 }));
  }

  const counts = countByField(
    (data ?? []).map((row) => ({ field: typeof row.interest === "string" ? row.interest : null })),
  );

  return VISITOR_INTERESTS.map((item) => ({
    key: item.value,
    label: item.label,
    value: counts.get(item.value) ?? 0,
  }));
}

export async function fetchCountryBreakdown(supabase: SupabaseClient): Promise<ChartCountRow[]> {
  const { data, error } = await supabase.from("visitor_registrations").select("country");
  if (error) {
    console.error("[AdminOverviewCharts] country query failed", error);
    return [];
  }

  const counts = countByField(
    (data ?? []).map((row) => ({ field: typeof row.country === "string" ? row.country : null })),
  );
  counts.delete("__empty__");

  const sorted = [...counts.entries()]
    .map(([key, value]) => ({ key, label: key, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= COUNTRY_TOP_N) return sorted;

  const top = sorted.slice(0, COUNTRY_TOP_N);
  const otherTotal = sorted.slice(COUNTRY_TOP_N).reduce((sum, row) => sum + row.value, 0);
  if (otherTotal > 0) {
    top.push({ key: "other", label: "Other", value: otherTotal });
  }
  return top;
}

export type AdminOverviewChartData = {
  checkInProgress: CheckInProgressPoint[];
  visitorInterest: ChartCountRow[];
  country: ChartCountRow[];
};

export async function fetchAdminOverviewChartData(
  supabase: SupabaseClient,
): Promise<AdminOverviewChartData> {
  const [checkInProgress, visitorInterest, country] = await Promise.all([
    fetchCheckInProgressSeries(supabase),
    fetchVisitorInterestBreakdown(supabase),
    fetchCountryBreakdown(supabase),
  ]);

  return {
    checkInProgress,
    visitorInterest,
    country,
  };
}
