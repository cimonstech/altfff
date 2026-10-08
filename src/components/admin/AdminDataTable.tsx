"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import { storePreloadedRecipients, applyVisitorCheckInFilter, VISITOR_CHECK_IN_FILTER_LABELS, type CustomRecipient, type VisitorCheckInFilter } from "@/lib/communications";
import { adminStatusPillClass, formatAdminStatusLabel, ADMIN_TABLE_LIST_ICONS, ADMIN_LIST_EMPTY } from "@/components/admin/adminVisual";
import VisitorDetailPanel from "@/components/admin/VisitorDetailPanel";
import EmptyState from "@/components/ui/states/EmptyState";
import NoSearchResults from "@/components/ui/states/NoSearchResults";
import ErrorState from "@/components/ui/states/ErrorState";
import LoadingSkeleton from "@/components/ui/states/LoadingSkeleton";
import InlineErrorMessage from "@/components/ui/states/InlineErrorMessage";
import { hasActiveListFilters } from "@/lib/listFilters";

export type AdminColumn = {
  label: string;
  /** Real column name if this maps to one directly (used for CSV export
   * and as the fallback display accessor); purely cosmetic/derived columns
   * (e.g. a combined "name" built from first_name + last_name) can use any
   * unique string here since `format` receives the whole row anyway. */
  field: string;
  /** Receives the full row so derived/combined values are possible (e.g.
   * joining first_name + last_name). Falls back to `row[field]` when
   * omitted. */
  format?: (row: Record<string, unknown>) => React.ReactNode;
};

/** Rows per page for both mobile cards and the desktop table. */
const PAGE_SIZE = 25;
/** Hard cap when exporting all filtered rows (not just the current page). */
const EXPORT_CAP = 2000;

/** Tables that track first-open via `viewed_at` (UI unread styling only). */
const VIEWED_AT_TABLES = new Set([
  "exhibitor_applications",
  "sponsor_inquiries",
  "visitor_registrations",
]);

function isUnreadRow(table: string, row: Record<string, unknown>): boolean {
  if (table === "contact_messages") return row.status === "new";
  if (VIEWED_AT_TABLES.has(table)) return row.viewed_at == null;
  return false;
}

function toDisplayValue(row: Record<string, unknown>, field: string): React.ReactNode {
  const value = row[field];
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatDateTime(value: unknown): string {
  if (!value || typeof value !== "string") return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function formatDateShort(value: unknown): string {
  if (!value || typeof value !== "string") return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { dateStyle: "medium" });
}

type EntityNote = {
  id: string;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
  note: string;
};

type CurrentAdmin = { id: string; name: string };

/** Minimal CSV field escaping: wrap in quotes and double any internal
 * quotes whenever the value contains a comma, quote, or newline. */
function csvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((r) => r.map(csvField).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type FilterOpts = {
  statusFilter: string;
  search: string;
  searchFields: string[];
  checkInFilter: VisitorCheckInFilter | null;
};

type FilterableQuery = {
  eq: (column: string, value: string) => FilterableQuery;
  or: (filters: string) => FilterableQuery;
  not: (column: string, operator: string, value: null) => FilterableQuery;
  is: (column: string, value: null) => FilterableQuery;
};

/** Apply status + text search (+ optional visitor check-in) to a Supabase query builder. */
function applyListFilters<T extends FilterableQuery>(query: T, opts: FilterOpts): T {
  let next: FilterableQuery = query;
  if (opts.statusFilter !== "all") {
    next = next.eq("status", opts.statusFilter);
  }
  if (opts.checkInFilter) {
    next = applyVisitorCheckInFilter(next, opts.checkInFilter);
  }
  const q = opts.search.trim();
  if (q && opts.searchFields.length > 0) {
    next = next.or(opts.searchFields.map((f) => `${f}.ilike.%${q}%`).join(","));
  }
  return next as T;
}

function vettingDropdownStatuses(allStatuses: string[], currentStatus: string): string[] {
  const manual = allStatuses.filter((s) => s !== "confirmed" && s !== "declined");
  if (
    (currentStatus === "confirmed" || currentStatus === "declined") &&
    !manual.includes(currentStatus)
  ) {
    return [...manual, currentStatus];
  }
  return manual;
}

export default function AdminDataTable({
  table,
  entityLabel,
  columns,
  detailFields,
  statuses,
  searchFields,
  titleField,
  getTitle,
  visitorVetting = false,
  enableCheckInFilter = false,
  rowHeaderExtra,
}: {
  /** Real Supabase table name. */
  table: string;
  /** Singular display name, e.g. "Exhibitor Application". */
  entityLabel: string;
  /** Columns shown in the list table (and exported to CSV, in this order). */
  columns: AdminColumn[];
  /** Fields shown in the row detail modal (admin_notes/status/timestamps
   * are handled separately, don't repeat them here). */
  detailFields: AdminColumn[];
  /** Valid status values for this entity, drives the filter dropdown and
   * the per-row status editor - must match the migration's check
   * constraint exactly. */
  statuses: string[];
  /** Real column names to text-search against via ilike. */
  searchFields: string[];
  /** Which field to show as the detail modal's heading. Ignored if
   * `getTitle` is provided (needed for entities like contact_messages,
   * split across first_name/last_name rather than one name field). */
  titleField: string;
  /** Overrides titleField for entities with no single "name" column. */
  getTitle?: (row: Record<string, unknown>) => React.ReactNode;
  /** Visitor registrations: Approve/Decline actions; status dropdown excludes confirmed/declined. */
  visitorVetting?: boolean;
  /** visitor_registrations only: adds Checked in / Not checked in filter. */
  enableCheckInFilter?: boolean;
  /** Extra badge(s) beside status on mobile list cards (e.g. walk-in vs pre-registered). */
  rowHeaderExtra?: (row: Record<string, unknown>) => React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [checkInFilter, setCheckInFilter] = useState<VisitorCheckInFilter>("all");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);
  // One expanded card at a time keeps long lists scannable.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Keyed by row id - persists across pages so "Message Selected" works
  // for rows chosen on page 1 and page 3 together.
  const [selectedRows, setSelectedRows] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [statusErrors, setStatusErrors] = useState<Map<string, string>>(new Map());

  const filterOpts = useMemo(
    () => ({
      statusFilter,
      search,
      searchFields,
      checkInFilter: enableCheckInFilter ? checkInFilter : null,
    }),
    [statusFilter, search, searchFields, enableCheckInFilter, checkInFilter],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageFrom = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const pageTo = Math.min(totalCount, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("admin_profiles").select("full_name").eq("id", user.id).single();
      setCurrentAdmin({ id: user.id, name: profile?.full_name || user.email || "Unknown admin" });
    })();
  }, [supabase]);

  // Search / status change: jump back to first page and collapse cards
  // (done in the control handlers so the next fetch already uses page 0).

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    query = applyListFilters(query, filterOpts);

    const { data, error, count } = await query;
    if (error) {
      console.error(`Failed to load ${table}:`, error);
      setLoadError("Failed to load data. Please try again.");
      setRows([]);
      setTotalCount(0);
    } else {
      setRows(data ?? []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [supabase, table, filterOpts, page]);

  // If filters shrink the result set past the current page, clamp.
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    if (page > pages - 1) setPage(pages - 1);
  }, [totalCount, page]);

  useEffect(() => {
    // Debounce search re-fetches; page/status fire via the same effect.
    const t = setTimeout(fetchRows, search.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchRows, search]);

  const updateRow = async (id: string, patch: Record<string, unknown>) => {
    const { data, error } = await supabase.from(table).update(patch).eq("id", id).select().single();
    if (error) {
      console.error(`Failed to update ${table} row ${id}:`, error);
      return { data: null, error: "Update failed. Please try again." };
    }
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
    setSelected((prev) => (prev && prev.id === id ? data : prev));
    setSelectedRows((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.set(id, data);
      return next;
    });
    return { data, error: null };
  };

  const handleStatusChange = async (
    row: Record<string, unknown>,
    newStatus: string,
  ): Promise<string | null> => {
    const { data, error } = await updateRow(row.id as string, { status: newStatus });
    if (error || !data) return error ?? "Failed to update status. Please try again.";
    return null;
  };

  /**
   * Contact: opening a `new` message marks it `read` via the same update
   * path as a manual status change (activity log: new → read).
   *
   * Exhibitor/Sponsor/Visitor: first open stamps `viewed_at` only (UI unread
   * styling). Does not change status, does not write activity_logs, and does
   * not affect sidebar badge counts.
   */
  const openDetail = async (row: Record<string, unknown>) => {
    setSelected(row);
    if (table === "contact_messages" && row.status === "new") {
      await handleStatusChange(row, "read");
      return;
    }
    if (VIEWED_AT_TABLES.has(table) && row.viewed_at == null) {
      const { error } = await updateRow(row.id as string, { viewed_at: new Date().toISOString() });
      if (error) console.error("Failed to mark row viewed:", error);
    }
  };

  /** Export every row matching the current filters (not just this page). */
  const handleExport = async () => {
    setExporting(true);
    try {
      let query = supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(EXPORT_CAP);
      query = applyListFilters(query, filterOpts);
      const { data, error } = await query;
      if (error) {
        console.error(`Failed to export ${table}:`, error);
        setLoadError("Failed to export CSV. Please try again.");
        return;
      }
      const exportRows = data ?? [];
      const headers = columns.map((c) => c.label);
      const csvRows = exportRows.map((row) =>
        columns.map((c) => (c.format ? String(c.format(row) ?? "") : String(toDisplayValue(row, c.field)))),
      );
      downloadCsv(`${table}-${new Date().toISOString().slice(0, 10)}.csv`, headers, csvRows);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error: logError } = await supabase.from("activity_logs").insert({
          actor_id: user.id,
          actor_email: user.email,
          action: "export",
          target_table: table,
          details: {
            filters: {
              search: search.trim() || null,
              status: statusFilter,
              checkIn: enableCheckInFilter ? checkInFilter : null,
            },
            row_count: exportRows.length,
            capped: exportRows.length >= EXPORT_CAP,
          },
        });
        if (logError) console.error("Failed to log export:", logError);
      }
    } finally {
      setExporting(false);
    }
  };

  const toggleRowSelected = (row: Record<string, unknown>) => {
    const id = row.id as string;
    setSelectedRows((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, row);
      return next;
    });
  };

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedRows.has(r.id as string));
  const toggleSelectAllVisible = () => {
    setSelectedRows((prev) => {
      const next = new Map(prev);
      if (allVisibleSelected) {
        rows.forEach((r) => next.delete(r.id as string));
      } else {
        rows.forEach((r) => next.set(r.id as string, r));
      }
      return next;
    });
  };

  /** Every one of the four tables AdminDataTable is used for has real
   * `email`/`phone` columns; `titleField`/`getTitle` (already required by
   * every caller, for the row-detail modal's heading) doubles as the name
   * source here rather than adding a new prop just for this. */
  const extractRecipient = (row: Record<string, unknown>): CustomRecipient => {
    const rawName = getTitle ? getTitle(row) : toDisplayValue(row, titleField);
    const name = typeof rawName === "string" && rawName && rawName !== "-" ? rawName : null;
    return {
      email: typeof row.email === "string" && row.email ? row.email : null,
      phone: typeof row.phone === "string" && row.phone ? row.phone : null,
      name,
    };
  };

  const handleMessageSelected = () => {
    const recipients = Array.from(selectedRows.values()).map(extractRecipient);
    storePreloadedRecipients(recipients);
    router.push("/admin/communications");
  };

  const rowTitle = (row: Record<string, unknown>) =>
    getTitle ? getTitle(row) : toDisplayValue(row, titleField);

  const rowDropdownStatuses = (currentStatus: string) =>
    visitorVetting ? vettingDropdownStatuses(statuses, currentStatus) : statuses;

  const applyRowUpdate = (data: Record<string, unknown>) => {
    const id = data.id as string;
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
    setSelected((prev) => (prev && prev.id === id ? data : prev));
    setSelectedRows((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.set(id, data);
      return next;
    });
  };

  /** Secondary fields for expanded mobile cards - skip title/status/created. */
  const cardSecondaryColumns = columns.filter(
    (c) =>
      c.field !== titleField &&
      c.field !== "status" &&
      c.field !== "created_at" &&
      c.field !== "name",
  );

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCheckInFilter("all");
    setPage(0);
    setExpandedId(null);
  };

  const hasActiveFilters = hasActiveListFilters(
    search,
    statusFilter,
    "all",
    enableCheckInFilter ? checkInFilter : null,
  );
  const listIcon = ADMIN_TABLE_LIST_ICONS[table];
  const emptyCopy = ADMIN_LIST_EMPTY[table] ?? {
    title: `No ${entityLabel.toLowerCase()} records yet`,
    description: "New submissions will appear here.",
  };

  const listEmptyState =
    !loading && !loadError && rows.length === 0 ? (
      hasActiveFilters ? (
        <NoSearchResults onClear={clearFilters} className="mt-4" />
      ) : listIcon ? (
        <EmptyState
          icon={listIcon}
          title={emptyCopy.title}
          description={emptyCopy.description}
          className="mt-4"
        />
      ) : null
    ) : null;

  const setRowStatusError = (id: string, message: string | null) => {
    setStatusErrors((prev) => {
      const next = new Map(prev);
      if (message) next.set(id, message);
      else next.delete(id);
      return next;
    });
  };

  const runStatusChange = async (row: Record<string, unknown>, newStatus: string): Promise<string | null> => {
    const id = row.id as string;
    setRowStatusError(id, null);
    const err = await handleStatusChange(row, newStatus);
    if (err) setRowStatusError(id, err);
    return err;
  };

  const goToPage = (next: number) => {
    setExpandedId(null);
    setPage(Math.max(0, Math.min(totalPages - 1, next)));
  };

  const pagination = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-ink/50">
        {loading
          ? "Loading…"
          : totalCount === 0
            ? "0 results"
            : `Showing ${pageFrom}-${pageTo} of ${totalCount}`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goToPage(page - 1)}
          disabled={loading || page <= 0}
          className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-[4.5rem] text-center text-xs text-ink/60">
          {totalCount === 0 ? "-" : `${page + 1} / ${totalPages}`}
        </span>
        <button
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={loading || page >= totalPages - 1 || totalCount === 0}
          className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Sticky on mobile below the drawer top bar (h-14 / top-14); static on desktop. */}
      <div className="sticky top-14 z-30 -mx-4 space-y-3 border-b border-hairline bg-paper/95 px-4 py-3 backdrop-blur-sm md:static md:z-auto md:mx-0 md:space-y-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
              setExpandedId(null);
            }}
            className="min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold sm:max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
              setExpandedId(null);
            }}
            className="min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold sm:w-auto sm:text-sm"
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {enableCheckInFilter && (
            <select
              value={checkInFilter}
              onChange={(e) => {
                setCheckInFilter(e.target.value as VisitorCheckInFilter);
                setPage(0);
                setExpandedId(null);
              }}
              className="min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold sm:w-auto sm:text-sm"
              aria-label="Check-in filter"
            >
              {(Object.entries(VISITOR_CHECK_IN_FILTER_LABELS) as [VisitorCheckInFilter, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {selectedRows.size > 0 && (
              <button
                type="button"
                onClick={handleMessageSelected}
                className="inline-flex min-h-11 items-center rounded-full bg-gold px-4 py-2 text-sm font-medium text-ink hover:opacity-85"
              >
                Message Selected ({selectedRows.size})
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void handleExport();
              }}
              disabled={exporting || totalCount === 0}
              className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:mt-3">
          <p className="text-xs text-ink/50 md:hidden">
            {loading
              ? "Loading…"
              : totalCount === 0
                ? "0 results"
                : `Showing ${pageFrom}-${pageTo} of ${totalCount}`}
          </p>
          {/* Select all on the current page only - selection Map still
              accumulates across pages for Message Selected. */}
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-ink/60 md:hidden">
            <input
              type="checkbox"
              aria-label="Select all rows on this page"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="h-5 w-5 rounded border-hairline"
            />
            Select page
          </label>
        </div>
      </div>

      <div className="mt-3 hidden md:block">{pagination}</div>

      {loadError && (
        <ErrorState
          compact
          title="Could not load records"
          description={loadError}
          onRetry={() => void fetchRows()}
          className="mt-4 rounded-xl border border-hairline bg-surface"
        />
      )}

      {loading && (
        <>
          <LoadingSkeleton variant="cards" className="mt-4 md:hidden" />
          <LoadingSkeleton variant="table" className="mt-4 hidden md:block" />
        </>
      )}

      {!loading && listEmptyState}

      {/* Mobile card list - collapsed by default (title / status / date). */}
      <ul className={`mt-4 flex flex-col gap-2 md:hidden ${loading ? "hidden" : ""}`}>
        {rows.map((row) => {
          const unread = isUnreadRow(table, row);
          const status = typeof row.status === "string" ? row.status : "";
          const id = row.id as string;
          const expanded = expandedId === id;

          return (
            <li key={id}>
              <div
                className={`rounded-md border border-hairline bg-surface ${expanded ? "ring-1 ring-gold/40" : ""}`}
              >
                <div className="flex items-stretch gap-0">
                  <label
                    className="flex h-auto min-h-14 w-11 shrink-0 cursor-pointer items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      aria-label="Select row"
                      checked={selectedRows.has(id)}
                      onChange={() => toggleRowSelected(row)}
                      className="h-5 w-5 rounded border-hairline"
                    />
                  </label>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : id)}
                    className="min-w-0 flex-1 px-2 py-3 text-left"
                  >
                    <p className={`text-base leading-snug text-ink ${unread ? "font-semibold" : "font-medium"}`}>
                      {rowTitle(row)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {status && (
                        <span
                          className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${adminStatusPillClass(status)}`}
                        >
                          {formatAdminStatusLabel(status)}
                        </span>
                      )}
                      {rowHeaderExtra?.(row)}
                      <span className="text-xs text-ink/50">{formatDateShort(row.created_at)}</span>
                      <span className="text-xs font-medium text-ink/35" aria-hidden="true">
                        {expanded ? "▴" : "▾"}
                      </span>
                    </div>
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-hairline px-3 pb-3 pt-2">
                    {cardSecondaryColumns.length > 0 && (
                      <dl className="space-y-1.5">
                        {cardSecondaryColumns.map((c) => (
                          <div key={c.field} className="flex gap-2 text-sm">
                            <dt className="w-24 shrink-0 text-ink/45">{c.label}</dt>
                            <dd className="min-w-0 break-words text-ink">
                              {c.format ? c.format(row) : toDisplayValue(row, c.field)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    <div className="mt-3">
                      <label htmlFor={`mobile-status-${id}`} className="block text-xs font-semibold uppercase tracking-wide text-ink/50">
                        Status
                      </label>
                      <select
                        id={`mobile-status-${id}`}
                        value={status}
                        onChange={(e) => {
                          void runStatusChange(row, e.target.value);
                        }}
                        className="mt-1 min-h-11 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
                      >
                        {rowDropdownStatuses(status).map((s) => (
                          <option
                            key={s}
                            value={s}
                            disabled={visitorVetting && (s === "confirmed" || s === "declined") && s !== status}
                          >
                            {formatAdminStatusLabel(s)}
                          </option>
                        ))}
                      </select>
                      {statusErrors.get(id) && (
                        <InlineErrorMessage
                          className="mt-2"
                          message={statusErrors.get(id)!}
                          onRetry={() => void runStatusChange(row, status)}
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        void openDetail(row);
                      }}
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-gold-deep hover:bg-paper"
                    >
                      Full details &amp; notes
                    </button>

                    {visitorVetting && (
                      <VisitorDetailPanel
                        compact
                        row={row}
                        onRowUpdated={(data) => {
                          applyRowUpdate(data);
                          setExpandedId(id);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop table */}
      <div className={`mt-4 hidden overflow-x-auto rounded-md border border-hairline md:block ${loading ? "!hidden" : ""}`}>
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface">
              <th scope="col" className="w-12 p-3">
                <label className="flex h-11 w-11 items-center justify-center">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-5 w-5 rounded border-hairline"
                  />
                </label>
              </th>
              {columns.map((c) => (
                <th key={c.field} scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const unread = isUnreadRow(table, row);
              return (
                <tr
                  key={row.id as string}
                  onClick={() => {
                    void openDetail(row);
                  }}
                  className="cursor-pointer border-t border-hairline hover:bg-surface"
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <label className="flex h-11 w-11 items-center justify-center">
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={selectedRows.has(row.id as string)}
                        onChange={() => toggleRowSelected(row)}
                        className="h-5 w-5 rounded border-hairline"
                      />
                    </label>
                  </td>
                  {columns.map((c, colIndex) => (
                    <td
                      key={c.field}
                      className={`p-3 text-ink ${unread && colIndex === 0 ? "font-semibold" : "font-normal"}`}
                    >
                      {c.format ? c.format(row) : toDisplayValue(row, c.field)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4">{pagination}</div>

      <Modal isOpen={selected !== null} onClose={() => setSelected(null)} titleId="admin-row-detail-heading" panelClassName="max-w-lg">
        {selected && (
          <RowDetail
            key={selected.id as string}
            row={selected}
            entityLabel={entityLabel}
            detailFields={detailFields}
            statuses={statuses}
            rowDropdownStatuses={rowDropdownStatuses}
            titleField={titleField}
            getTitle={getTitle}
            table={table}
            supabase={supabase}
            currentAdmin={currentAdmin}
            onStatusChange={(newStatus) => runStatusChange(selected, newStatus)}
            visitorVetting={visitorVetting}
            onRowUpdated={applyRowUpdate}
          />
        )}
      </Modal>
    </div>
  );
}

function RowDetail({
  row,
  entityLabel,
  detailFields,
  statuses,
  rowDropdownStatuses,
  titleField,
  getTitle,
  table,
  supabase,
  currentAdmin,
  onStatusChange,
  visitorVetting = false,
  onRowUpdated,
}: {
  row: Record<string, unknown>;
  entityLabel: string;
  detailFields: AdminColumn[];
  statuses: string[];
  rowDropdownStatuses: (current: string) => string[];
  titleField: string;
  getTitle?: (row: Record<string, unknown>) => React.ReactNode;
  table: string;
  supabase: ReturnType<typeof createClient>;
  currentAdmin: CurrentAdmin | null;
  onStatusChange: (status: string) => Promise<string | null>;
  visitorVetting?: boolean;
  onRowUpdated?: (row: Record<string, unknown>) => void;
}) {
  const [notes, setNotes] = useState<EntityNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [noteError, setNoteError] = useState("");

  const rowId = row.id as string;
  const currentStatus = String(row.status ?? "");
  const statusOptions = rowDropdownStatuses(currentStatus);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNotesLoading(true);
      const { data, error } = await supabase
        .from("entity_notes")
        .select("id, created_at, author_id, author_name, note")
        .eq("entity_table", table)
        .eq("entity_id", rowId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load entity notes:", error);
      } else {
        setNotes((data ?? []) as EntityNote[]);
      }
      setNotesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, table, rowId]);

  const handleAddNote = async () => {
    const trimmed = newNote.trim();
    if (!trimmed || !currentAdmin) return;
    setSubmitting(true);
    setNoteError("");
    const { data, error } = await supabase
      .from("entity_notes")
      .insert({
        entity_table: table,
        entity_id: rowId,
        author_id: currentAdmin.id,
        author_name: currentAdmin.name,
        note: trimmed,
      })
      .select("id, created_at, author_id, author_name, note")
      .single();
    if (error) {
      console.error("Failed to add note:", error);
      setNoteError("Failed to add note. Please try again.");
    } else if (data) {
      setNotes((prev) => [...prev, data as EntityNote]);
      setNewNote("");
    }
    setSubmitting(false);
  };

  const handleStatusSelect = async (newStatus: string) => {
    setStatusError("");
    const err = await onStatusChange(newStatus);
    if (err) setStatusError(err);
  };

  return (
    <div className="p-6 md:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep">{entityLabel}</p>
      <h2 id="admin-row-detail-heading" className="mt-1 pr-8 font-display text-lg font-extrabold uppercase tracking-tight text-ink">
        {getTitle ? getTitle(row) : toDisplayValue(row, titleField)}
      </h2>

      <div className="mt-4 flex flex-wrap gap-6 text-xs text-ink/60">
        <span>Created: {formatDateTime(row.created_at)}</span>
        <span>Status updated: {formatDateTime(row.status_updated_at)}</span>
      </div>

      <div className="mt-5">
        <label htmlFor="detail-status" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
          Status
        </label>
        <select
          id="detail-status"
          value={currentStatus}
          onChange={(e) => {
            void handleStatusSelect(e.target.value);
          }}
          className="mt-1 min-h-11 w-full max-w-xs rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s} disabled={visitorVetting && (s === "confirmed" || s === "declined") && s !== currentStatus}>
              {formatAdminStatusLabel(s)}
            </option>
          ))}
        </select>
        {statusError && (
          <InlineErrorMessage
            className="mt-2 max-w-xs"
            message={statusError}
            onRetry={() => void handleStatusSelect(currentStatus)}
          />
        )}
      </div>

      {visitorVetting && onRowUpdated && (
        <VisitorDetailPanel row={row} onRowUpdated={onRowUpdated} />
      )}

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {detailFields.map((f) => (
          <div key={f.field}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/50">{f.label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{f.format ? f.format(row) : toDisplayValue(row, f.field)}</dd>
          </div>
        ))}
      </dl>

      {/* Append-only note thread (entity_notes) - replaces the old single
          overwritable admin_notes column. No edit/delete UI: notes are
          immutable once written (no update/delete RLS policy exists for
          this table), matching an audit-trail, not a scratchpad. */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/60">Notes</h3>

        <div className="mt-2 flex flex-col gap-3">
          {notesLoading && <p className="text-sm text-ink/50">Loading notes…</p>}
          {!notesLoading && notes.length === 0 && (
            <p className="text-sm text-ink/50">No notes yet.</p>
          )}
          {notes.map((n) => (
            <div key={n.id} className="rounded-md border border-hairline bg-surface p-3">
              <p className="text-sm text-ink">{n.note}</p>
              <p className="mt-1 text-xs text-ink/50">
                {n.author_name || "Unknown admin"} · {formatDateTime(n.created_at)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <textarea
            rows={3}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note…"
            className="w-full resize-none rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
          />
          <button
            type="button"
            onClick={() => void handleAddNote()}
            disabled={submitting || !newNote.trim()}
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add Note"}
          </button>
          {noteError && (
            <InlineErrorMessage message={noteError} onRetry={() => void handleAddNote()} />
          )}
        </div>
      </div>
    </div>
  );
}
