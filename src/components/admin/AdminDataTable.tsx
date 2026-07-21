"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import { storePreloadedRecipients, type CustomRecipient } from "@/lib/communications";

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

// Rows beyond this are simply not fetched - an admin tool for a
// thousands-of-rows-at-most dataset doesn't need real pagination UI, per
// the brief; this is the "reasonable page-size limit" instead.
const ROW_LIMIT = 500;

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
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatDateTime(value: unknown): string {
  if (!value || typeof value !== "string") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
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

export default function AdminDataTable({
  table,
  entityLabel,
  columns,
  detailFields,
  statuses,
  searchFields,
  titleField,
  getTitle,
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
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);
  // Keyed by row id, not just a Set of ids - keeps each selected row's own
  // data available for the "Message Selected" hand-off even if a search or
  // status-filter change makes it drop out of the currently-loaded `rows`.
  const [selectedRows, setSelectedRows] = useState<Map<string, Record<string, unknown>>>(new Map());

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

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    let query = supabase.from(table).select("*").order("created_at", { ascending: false }).limit(ROW_LIMIT);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    const q = search.trim();
    if (q && searchFields.length > 0) {
      query = query.or(searchFields.map((f) => `${f}.ilike.%${q}%`).join(","));
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Failed to load ${table}:`, error);
      setLoadError("Failed to load data. Please try again.");
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }, [supabase, table, statusFilter, search, searchFields]);

  useEffect(() => {
    // Debounce search re-fetches; status-filter changes fire immediately
    // via the same effect since both are dependencies.
    const t = setTimeout(fetchRows, 300);
    return () => clearTimeout(t);
  }, [fetchRows]);

  const updateRow = async (id: string, patch: Record<string, unknown>) => {
    const { data, error } = await supabase.from(table).update(patch).eq("id", id).select().single();
    if (error) {
      console.error(`Failed to update ${table} row ${id}:`, error);
      return null;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
    setSelected((prev) => (prev && prev.id === id ? data : prev));
    return data;
  };

  const handleStatusChange = async (row: Record<string, unknown>, newStatus: string) => {
    // The migration's log_status_change trigger auto-logs this to
    // activity_logs - no duplicate application-level logging here.
    await updateRow(row.id as string, { status: newStatus });
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
      await updateRow(row.id as string, { viewed_at: new Date().toISOString() });
    }
  };

  const handleExport = async () => {
    const headers = columns.map((c) => c.label);
    const csvRows = rows.map((row) =>
      columns.map((c) => (c.format ? String(c.format(row) ?? "") : String(toDisplayValue(row, c.field)))),
    );
    downloadCsv(`${table}-${new Date().toISOString().slice(0, 10)}.csv`, headers, csvRows);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from("activity_logs").insert({
        actor_id: user.id,
        actor_email: user.email,
        action: "export",
        target_table: table,
        details: { filters: { search: search.trim() || null, status: statusFilter }, row_count: rows.length },
      });
      if (error) console.error("Failed to log export:", error);
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
    const name = typeof rawName === "string" && rawName && rawName !== "—" ? rawName : null;
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

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold sm:w-auto"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-gold"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {selectedRows.size > 0 && (
          <button
            type="button"
            onClick={handleMessageSelected}
            className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-ink hover:opacity-85"
          >
            Message Selected ({selectedRows.size})
          </button>
        )}
        <button
          type="button"
          onClick={handleExport}
          disabled={rows.length === 0}
          className="ml-auto rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      <p className="mt-3 text-xs text-ink/50">
        {loading ? "Loading…" : `${rows.length} result${rows.length === 1 ? "" : "s"}`}
        {rows.length === ROW_LIMIT && " (showing the first 500 - narrow your search or filter for more)"}
      </p>

      {loadError && (
        <p className="mt-2 text-sm text-madder" role="alert">
          {loadError}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-md border border-hairline">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface">
              <th scope="col" className="w-10 p-3">
                <input
                  type="checkbox"
                  aria-label="Select all visible rows"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4 rounded border-hairline"
                />
              </th>
              {columns.map((c) => (
                <th key={c.field} scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="p-3 text-ink/60">
                  No {entityLabel.toLowerCase()} records found.
                </td>
              </tr>
            )}
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
                  <input
                    type="checkbox"
                    aria-label={`Select row`}
                    checked={selectedRows.has(row.id as string)}
                    onChange={() => toggleRowSelected(row)}
                    className="h-4 w-4 rounded border-hairline"
                  />
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

      <Modal isOpen={selected !== null} onClose={() => setSelected(null)} titleId="admin-row-detail-heading" panelClassName="max-w-lg">
        {selected && (
          <RowDetail
            key={selected.id as string}
            row={selected}
            entityLabel={entityLabel}
            detailFields={detailFields}
            statuses={statuses}
            titleField={titleField}
            getTitle={getTitle}
            table={table}
            supabase={supabase}
            currentAdmin={currentAdmin}
            onStatusChange={(newStatus) => handleStatusChange(selected, newStatus)}
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
  titleField,
  getTitle,
  table,
  supabase,
  currentAdmin,
  onStatusChange,
}: {
  row: Record<string, unknown>;
  entityLabel: string;
  detailFields: AdminColumn[];
  statuses: string[];
  titleField: string;
  getTitle?: (row: Record<string, unknown>) => React.ReactNode;
  table: string;
  supabase: ReturnType<typeof createClient>;
  currentAdmin: CurrentAdmin | null;
  onStatusChange: (status: string) => void;
}) {
  const [notes, setNotes] = useState<EntityNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const rowId = row.id as string;

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
    } else if (data) {
      setNotes((prev) => [...prev, data as EntityNote]);
      setNewNote("");
    }
    setSubmitting(false);
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
          value={String(row.status ?? "")}
          onChange={(e) => onStatusChange(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

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
            onClick={handleAddNote}
            disabled={submitting || !newNote.trim()}
            className="inline-flex w-fit items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
