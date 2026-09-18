"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatMessageChannel,
  formatMessageStatus,
  formatMessageType,
  MESSAGE_TYPE_OPTIONS,
} from "@/lib/messageLogLabels";

type ViewMode = "log" | "never_received" | "person_history";

type MessageLogRow = {
  id: string;
  channel: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  message_type: string;
  subject_or_summary: string | null;
  related_table: string | null;
  related_id: string | null;
  status: string;
  error_detail: string | null;
  sent_at: string;
};

type NeverReceivedRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  entity_table: string;
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function statusClass(status: string): string {
  if (status === "sent") return "text-forest";
  if (status === "quota_exceeded") return "text-gold-deep";
  return "text-madder";
}

export default function MessageLogView() {
  const [view, setView] = useState<ViewMode>("log");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [messageType, setMessageType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [entityTable, setEntityTable] = useState("visitor_registrations");
  const [personHistoryEmail, setPersonHistoryEmail] = useState("");

  const [rows, setRows] = useState<(MessageLogRow | NeverReceivedRow)[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ view });
    if (channel !== "all") params.set("channel", channel);
    if (status !== "all") params.set("status", status);
    if (messageType !== "all") params.set("messageType", messageType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (search.trim()) params.set("search", search.trim());
    if (view === "never_received") params.set("entityTable", entityTable);
    if (view === "person_history" && personHistoryEmail.trim()) {
      params.set("personEmail", personHistoryEmail.trim());
    }
    return params.toString();
  }, [view, channel, status, messageType, dateFrom, dateTo, search, entityTable, personHistoryEmail]);

  const fetchRows = useCallback(async () => {
    if (view === "person_history" && !personHistoryEmail.trim()) {
      setRows([]);
      setLoading(false);
      setLoadError("");
      return;
    }

    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/admin/message-log?${queryString}`);
      const data = (await res.json()) as { ok?: boolean; error?: string; rows?: (MessageLogRow | NeverReceivedRow)[] };
      if (!res.ok || !data.ok) {
        setLoadError(data.error ?? "Failed to load message log.");
        setRows([]);
      } else {
        setRows(data.rows ?? []);
      }
    } catch {
      setLoadError("Failed to load message log.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [queryString, view, personHistoryEmail]);

  useEffect(() => {
    const t = setTimeout(fetchRows, view === "person_history" ? 0 : search.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchRows, search, view]);

  const openPersonHistory = (email: string) => {
    setPersonHistoryEmail(email);
    setView("person_history");
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["log", "All messages"],
            ["never_received", "Never received anything"],
            ["person_history", "Person history"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-medium ${
              view === value ? "bg-forest text-paper" : "border border-hairline bg-surface text-ink hover:bg-paper"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {view !== "never_received" && (
          <>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50">
              Channel
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="all">All channels</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="all">All statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="quota_exceeded">Quota exceeded</option>
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50">
              Message type
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="all">All types</option>
                {MESSAGE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {view === "never_received" && (
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50">
            Registration type
            <select
              value={entityTable}
              onChange={(e) => setEntityTable(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="visitor_registrations">Visitors</option>
              <option value="exhibitor_applications">Exhibitors</option>
            </select>
          </label>
        )}

        {view === "person_history" && (
          <label className="col-span-full block text-xs font-semibold uppercase tracking-wide text-ink/50">
            Person email
            <input
              type="email"
              value={personHistoryEmail}
              onChange={(e) => setPersonHistoryEmail(e.target.value)}
              placeholder="name@example.com"
              className="mt-1 min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
            />
          </label>
        )}

        {view !== "person_history" && (
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50">
            Search
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or phone…"
              className="mt-1 min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
            />
          </label>
        )}

        {view !== "never_received" && view !== "person_history" && (
          <>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50">
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50">
              To
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink"
              />
            </label>
          </>
        )}
      </div>

      <p className="text-xs text-ink/50">
        {loading
          ? "Loading…"
          : view === "never_received"
            ? `${rows.length} registration${rows.length === 1 ? "" : "s"} with zero logged messages to their email`
            : `${rows.length} entr${rows.length === 1 ? "y" : "ies"}`}
      </p>

      {loadError && (
        <p className="text-sm text-madder" role="alert">
          {loadError}
        </p>
      )}

      {view === "never_received" ? (
        <div className="overflow-x-auto rounded-md border border-hairline bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-hairline bg-paper text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-ink/60">
                    Everyone in this list has at least one logged message to their email.
                  </td>
                </tr>
              )}
              {(rows as NeverReceivedRow[]).map((row) => (
                <tr key={row.id} className="border-b border-hairline/70 last:border-0">
                  <td className="px-4 py-3">{row.full_name || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openPersonHistory(row.email)}
                      className="text-left text-forest underline-offset-2 hover:underline"
                    >
                      {row.email}
                    </button>
                  </td>
                  <td className="px-4 py-3">{row.phone || "-"}</td>
                  <td className="px-4 py-3 capitalize">{row.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{formatDateTime(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-hairline bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-hairline bg-paper text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Recipient</th>
                <th className="px-4 py-3 font-semibold">Channel</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Summary</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-ink/60">
                    {view === "person_history" && !personHistoryEmail.trim()
                      ? "Enter an email address to see their full message history."
                      : "No messages match these filters."}
                  </td>
                </tr>
              )}
              {(rows as MessageLogRow[]).map((row) => (
                <tr key={row.id} className="border-b border-hairline/70 last:border-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.sent_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{row.recipient_name || row.recipient_email || row.recipient_phone || "-"}</p>
                    <p className="mt-0.5 text-xs text-ink/50">
                      {[row.recipient_email, row.recipient_phone].filter(Boolean).join(" · ")}
                    </p>
                  </td>
                  <td className="px-4 py-3">{formatMessageChannel(row.channel)}</td>
                  <td className="px-4 py-3">{formatMessageType(row.message_type)}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate">{row.subject_or_summary || "-"}</p>
                    {row.error_detail && <p className="mt-1 text-xs text-madder">{row.error_detail}</p>}
                  </td>
                  <td className={`px-4 py-3 capitalize ${statusClass(row.status)}`}>
                    {formatMessageStatus(row.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
