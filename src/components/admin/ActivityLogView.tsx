"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACTIVITY_ACTIONS,
  formatActivityAction,
  formatActivityDetailsJson,
  formatActivitySummary,
  formatActivityTarget,
} from "@/lib/activityLog";

type ActivityLogRow = {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
};

const ROW_LIMIT = 500;

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function ActivityLogView() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [actorSearch, setActorSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    let query = supabase
      .from("activity_logs")
      .select("id, created_at, actor_email, action, target_table, target_id, details")
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT);

    if (actionFilter !== "all") {
      query = query.eq("action", actionFilter);
    }

    const actor = actorSearch.trim();
    if (actor) {
      query = query.ilike("actor_email", `%${actor}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to load activity logs:", error);
      setLoadError("Failed to load activity log. You may not have permission to view this page.");
      setRows([]);
    } else {
      setRows((data ?? []) as ActivityLogRow[]);
    }
    setLoading(false);
  }, [supabase, actionFilter, actorSearch]);

  useEffect(() => {
    const t = setTimeout(fetchRows, actorSearch.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchRows, actorSearch]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Filter by actor email…"
          value={actorSearch}
          onChange={(e) => setActorSearch(e.target.value)}
          className="w-full max-w-xs rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold sm:w-auto"
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-gold"
        >
          <option value="all">All actions</option>
          {ACTIVITY_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {formatActivityAction(action)}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-xs text-ink/50">
        {loading ? "Loading…" : `${rows.length} entr${rows.length === 1 ? "y" : "ies"}`}
        {rows.length === ROW_LIMIT && " (showing the most recent 500 — narrow your filters for more)"}
      </p>

      {loadError && (
        <p className="mt-2 text-sm text-madder" role="alert">
          {loadError}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-md border border-hairline">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface">
              <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                When
              </th>
              <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                Actor
              </th>
              <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                Action
              </th>
              <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                Target
              </th>
              <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-ink/60">
                  No activity logged yet.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const summary = formatActivitySummary(row.action, row.details);
              const hasRawDetails = row.details && Object.keys(row.details).length > 0;
              const showFallbackJson = summary === "—" && hasRawDetails;
              const isExpanded = expandedId === row.id;

              return (
                <tr key={row.id} className="border-t border-hairline align-top">
                  <td className="p-3 whitespace-nowrap text-ink">{formatDateTime(row.created_at)}</td>
                  <td className="p-3 text-ink">{row.actor_email || "—"}</td>
                  <td className="p-3 text-ink">{formatActivityAction(row.action)}</td>
                  <td className="p-3 text-ink">{formatActivityTarget(row.target_table, row.target_id)}</td>
                  <td className="p-3 text-ink">
                    <div className="max-w-md">
                      <p>{showFallbackJson ? formatActivityDetailsJson(row.details) : summary}</p>
                      {hasRawDetails && !showFallbackJson && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                          className="mt-1 text-xs font-medium text-gold-deep hover:underline"
                        >
                          {isExpanded ? "Hide raw JSON" : "Show raw JSON"}
                        </button>
                      )}
                      {isExpanded && hasRawDetails && (
                        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-surface p-2 text-xs text-ink/80">
                          {formatActivityDetailsJson(row.details)}
                        </pre>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
