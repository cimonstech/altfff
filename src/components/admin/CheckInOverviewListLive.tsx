"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  checkInOverviewListTitle,
  fetchCheckInOverviewList,
  type CheckInOverviewListKind,
  type CheckInOverviewListRow,
} from "@/lib/checkInOverview";
import { storePreloadedRecipients, type CustomRecipient } from "@/lib/communications";
import { formatCheckInTime, visitorDisplayName } from "@/lib/visitorVetting";

const CHANNEL_NAME = "admin-checkin-overview-list";
const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 30000;
const PAGE_SIZE = 25;

function formatRegisteredTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function rowMatchesSearch(row: CheckInOverviewListRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [visitorDisplayName(row), row.email, row.phone ?? ""].join(" ").toLowerCase();
  return haystack.includes(q);
}

function toCustomRecipient(row: CheckInOverviewListRow): CustomRecipient {
  const name = visitorDisplayName(row);
  return {
    email: row.email || null,
    phone: row.phone?.trim() || null,
    name: name || null,
  };
}

type ListColumn = {
  label: string;
  cell: (row: CheckInOverviewListRow) => ReactNode;
};

function columnsForKind(kind: CheckInOverviewListKind): ListColumn[] {
  if (kind === "checkedIn") {
    return [
      {
        label: "Name",
        cell: (row) => visitorDisplayName(row),
      },
      {
        label: "Email",
        cell: (row) => row.email,
      },
      {
        label: "Phone",
        cell: (row) => row.phone?.trim() || "—",
      },
      {
        label: "Checked in",
        cell: (row) => (row.checked_in_at ? formatCheckInTime(row.checked_in_at) : "—"),
      },
      {
        label: "By",
        cell: (row) => row.checked_in_by_email?.trim() || "—",
      },
    ];
  }

  if (kind === "walkIns") {
    return [
      {
        label: "Name",
        cell: (row) => visitorDisplayName(row),
      },
      {
        label: "Email",
        cell: (row) => row.email,
      },
      {
        label: "Phone",
        cell: (row) => row.phone?.trim() || "—",
      },
      {
        label: "Registered",
        cell: (row) => formatRegisteredTime(row.created_at),
      },
    ];
  }

  return [
    {
      label: "Name",
      cell: (row) => visitorDisplayName(row),
    },
    {
      label: "Email",
      cell: (row) => row.email,
    },
  ];
}

export default function CheckInOverviewListLive({
  kind,
  initialRows,
  canSendMessages = false,
}: {
  kind: CheckInOverviewListKind;
  initialRows: CheckInOverviewListRow[];
  /** Full admins only — check-in staff cannot open Communications. */
  canSendMessages?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Map<string, CheckInOverviewListRow>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const columns = useMemo(() => columnsForKind(kind), [kind]);
  const messagingEnabled = canSendMessages && kind === "checkedIn";

  useEffect(() => {
    setRows(initialRows);
    setPage(0);
    setSelectedRows(new Map());
    setSearch("");
  }, [initialRows]);

  const filteredRows = useMemo(
    () => rows.filter((row) => rowMatchesSearch(row, search)),
    [rows, search],
  );

  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageFrom = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const pageTo = Math.min(totalCount, (page + 1) * PAGE_SIZE);
  const pageRows = filteredRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const refetchRows = useCallback(async () => {
    try {
      const next = await fetchCheckInOverviewList(supabase, kind);
      setRows(next);
    } catch (err) {
      console.error("[CheckInOverviewList] refetch failed", err);
    }
  }, [supabase, kind]);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refetchRows();
    }, 150);
  }, [refetchRows]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let connecting = false;
    let intentionalTeardown = false;

    const syncRealtimeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(session?.access_token ?? null);
    };

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const teardownChannel = async () => {
      if (!channel) return;
      intentionalTeardown = true;
      const existing = channel;
      channel = null;
      await supabase.removeChannel(existing);
      intentionalTeardown = false;
    };

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void subscribeChannel();
      }, delay);
    };

    const subscribeChannel = async () => {
      if (cancelled || connecting) return;
      connecting = true;
      clearReconnectTimer();

      try {
        await teardownChannel();
        await syncRealtimeAuth();
        if (cancelled) return;

        const nextChannel = supabase
          .channel(`${CHANNEL_NAME}:${kind}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "visitor_registrations" },
            () => scheduleRefetch(),
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "visitor_registrations" },
            () => scheduleRefetch(),
          );

        channel = nextChannel;
        nextChannel.subscribe((status) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") {
            reconnectAttempt = 0;
            return;
          }
          if (intentionalTeardown) return;
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            queueMicrotask(() => scheduleReconnect());
          }
        });
      } finally {
        connecting = false;
      }
    };

    void subscribeChannel();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      void teardownChannel();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [supabase, kind, scheduleRefetch]);

  const goToPage = (next: number) => {
    setPage(Math.max(0, Math.min(totalPages - 1, next)));
  };

  const toggleRowSelected = (row: CheckInOverviewListRow) => {
    setSelectedRows((prev) => {
      const next = new Map(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.set(row.id, row);
      return next;
    });
  };

  const allVisibleSelected =
    messagingEnabled && pageRows.length > 0 && pageRows.every((row) => selectedRows.has(row.id));

  const toggleSelectAllVisible = () => {
    setSelectedRows((prev) => {
      const next = new Map(prev);
      if (allVisibleSelected) {
        pageRows.forEach((row) => next.delete(row.id));
      } else {
        pageRows.forEach((row) => next.set(row.id, row));
      }
      return next;
    });
  };

  const handleMessageSelected = () => {
    const recipients = Array.from(selectedRows.values()).map(toCustomRecipient);
    storePreloadedRecipients(recipients);
    router.push("/admin/communications");
  };

  const title = checkInOverviewListTitle(kind);

  return (
    <div>
      <Link
        href="/admin/checkin-overview"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo transition-opacity hover:opacity-80"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
        Back to check-in overview
      </Link>

      <h1 className="mt-4 font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
        {title}
      </h1>
      <p className="mt-2 text-sm text-indigo">
        {rows.length} {rows.length === 1 ? "person" : "people"} · updates live as registrations change
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          placeholder="Search name, email, or phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold sm:max-w-sm"
        />
        {messagingEnabled && selectedRows.size > 0 && (
          <button
            type="button"
            onClick={handleMessageSelected}
            className="inline-flex min-h-11 items-center rounded-full bg-gold px-4 py-2 text-sm font-medium text-ink hover:opacity-85"
          >
            Message selected ({selectedRows.size})
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink/50">
          {totalCount === 0 ? "0 results" : `Showing ${pageFrom}-${pageTo} of ${totalCount}`}
        </p>
        <div className="flex items-center gap-2">
          {messagingEnabled && totalCount > 0 && (
            <label className="mr-2 flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-ink/60">
              <input
                type="checkbox"
                aria-label="Select all on this page"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                className="h-4 w-4 rounded border-hairline"
              />
              Select page
            </label>
          )}
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 0 || totalCount === 0}
            className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"
          >
            Previous
          </button>
          <span className="min-w-[4.5rem] text-center text-xs text-ink/60">
            {totalCount === 0 ? "—" : `${page + 1} / ${totalPages}`}
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages - 1 || totalCount === 0}
            className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {totalCount === 0 ? (
        <p className="mt-4 rounded-md border border-hairline bg-surface px-4 py-8 text-sm text-ink/60">
          {search.trim() ? "No matches for your search." : "No one here yet."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface">
                {messagingEnabled && (
                  <th scope="col" className="w-10 p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                    <span className="sr-only">Select</span>
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.label}
                    scope="col"
                    className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="border-t border-hairline hover:bg-surface/80">
                  {messagingEnabled && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${visitorDisplayName(row)}`}
                        checked={selectedRows.has(row.id)}
                        onChange={() => toggleRowSelected(row)}
                        className="h-4 w-4 rounded border-hairline"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.label} className="p-3 text-ink">
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink/50">
            Showing {pageFrom}-{pageTo} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 0}
              className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"
            >
              Previous
            </button>
            <span className="min-w-[4.5rem] text-center text-xs text-ink/60">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
