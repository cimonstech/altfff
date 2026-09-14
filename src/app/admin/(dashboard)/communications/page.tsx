"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import {
  AUDIENCE_CONFIG,
  AUDIENCE_TYPES,
  getRecipientDisplayName,
  parseCustomRecipients,
  consumePreloadedRecipients,
  type AudienceType,
  type CustomRecipient,
} from "@/lib/communications";
import AdminCard from "@/components/admin/AdminCard";
import EmptyState from "@/components/ui/states/EmptyState";
import ErrorState from "@/components/ui/states/ErrorState";
import LoadingSkeleton from "@/components/ui/states/LoadingSkeleton";
import { MessageSquare } from "lucide-react";

type ChannelOption = "email" | "sms" | "both";
type ComposeAudience = AudienceType | "custom";

function formatDateTime(value: unknown): string {
  if (!value || typeof value !== "string") return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminCommunicationsPage() {
  // ComposeForm and History are siblings with no shared state, so a
  // successful send doesn't otherwise tell History to refetch - without
  // this, a just-sent communication only shows up after a manual page
  // reload, which can look identical to "nothing is showing" if an admin
  // doesn't think to refresh. Bumped by ComposeForm on every successful
  // send; History refetches whenever it changes.
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">Communications</h1>
      <ComposeForm onSent={() => setHistoryRefreshToken((t) => t + 1)} />
      <History refreshToken={historyRefreshToken} />
    </div>
  );
}

function ComposeForm({ onSent }: { onSent: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [audience, setAudience] = useState<ComposeAudience>("exhibitor");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState<ChannelOption>("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewNames, setPreviewNames] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Custom audience: either freely typed/pasted (customMode "typed", no
  // names - see communications.ts's CustomRecipient doc) or handed off from
  // a data table's row selection (customMode "preloaded", real names
  // retained for merge-field personalization).
  const [customMode, setCustomMode] = useState<"typed" | "preloaded">("typed");
  const [customText, setCustomText] = useState("");
  const [preloadedRecipients, setPreloadedRecipients] = useState<CustomRecipient[]>([]);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const isCustom = audience === "custom";
  const config = isCustom ? null : AUDIENCE_CONFIG[audience];

  // Consume a pending row-selection hand-off (see AdminDataTable.tsx's
  // "Message Selected" button) exactly once, on mount.
  useEffect(() => {
    const preloaded = consumePreloadedRecipients();
    if (preloaded && preloaded.length > 0) {
      setAudience("custom");
      setCustomMode("preloaded");
      setPreloadedRecipients(preloaded);
    }
  }, []);

  // Reset the status filter whenever the audience changes - the previous
  // audience's status value has no meaning for the new one's check constraint.
  useEffect(() => {
    setStatus("all");
    setPreviewOpen(false);
  }, [audience]);

  const fetchCount = useCallback(async () => {
    if (!config) return;
    setCountLoading(true);
    // Count-only query (head: true) - never pulls the full row set just to
    // count it.
    let query = supabase.from(config.table).select("id", { count: "exact", head: true });
    if (status !== "all") query = query.eq("status", status);
    const { count, error } = await query;
    if (error) {
      console.error("Failed to count recipients:", error);
      setRecipientCount(null);
    } else {
      setRecipientCount(count ?? 0);
    }
    setCountLoading(false);
  }, [supabase, config, status]);

  useEffect(() => {
    if (isCustom) return;
    fetchCount();
  }, [isCustom, fetchCount]);

  // Parsed live from the textarea in "typed" mode; the structured, already-
  // validated list in "preloaded" mode. This is what actually gets sent.
  const { valid: typedRecipients, invalid: invalidTokens } = useMemo(
    () => parseCustomRecipients(customText),
    [customText],
  );
  const customRecipients = customMode === "preloaded" ? preloadedRecipients : typedRecipients;

  useEffect(() => {
    if (!isCustom) return;
    setRecipientCount(customRecipients.length);
  }, [isCustom, customRecipients.length]);

  const clearCustomSelection = () => {
    setCustomMode("typed");
    setPreloadedRecipients([]);
    setCustomText("");
  };

  const togglePreview = async () => {
    if (isCustom || !config) return;
    if (previewOpen) {
      setPreviewOpen(false);
      return;
    }
    setPreviewOpen(true);
    setPreviewLoading(true);
    let query = supabase.from(config.table).select(config.selectColumns).limit(200);
    if (status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      console.error("Failed to load recipient preview:", error);
      setPreviewNames([]);
    } else {
      const previewRows = (data ?? []) as unknown as Record<string, unknown>[];
      setPreviewNames(previewRows.map((row) => getRecipientDisplayName(audience as AudienceType, row)));
    }
    setPreviewLoading(false);
  };

  const requiresSubject = channel === "email" || channel === "both";
  const canSend = !sending && (recipientCount ?? 0) > 0 && body.trim().length > 0 && (!requiresSubject || subject.trim().length > 0);

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const payload = isCustom
        ? { audience, channel, subject, body, recipients: customRecipients, customSource: customMode }
        : { audience, status, channel, subject, body };
      const res = await fetch("/api/admin/communications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setResult({ ok: false, message: data.error ?? "Send failed." });
      } else if (data.status === "failed") {
        setResult({
          ok: false,
          message:
            data.failedCount != null
              ? `Failed to queue ${data.failedCount} of ${data.recipientCount} recipients. Check SITE_URL and QStash env vars on Vercel, then try again.`
              : "Send failed — no recipients were queued.",
        });
      } else if (data.status === "partially_failed") {
        setResult({
          ok: false,
          message: `Partially queued: ${data.queuedCount ?? "?"} of ${data.recipientCount} recipients. Some jobs failed to queue — check history for details.`,
        });
      } else if (data.status === "sending" || data.recipientCount > 1) {
        setResult({
          ok: true,
          message: `Queued for ${data.queuedCount ?? data.recipientCount} recipients — processing asynchronously.`,
        });
      } else {
        setResult({ ok: true, message: `Sent — final status: ${data.status}.` });
      }
      if (data.ok && data.status !== "failed" && data.status !== "partially_failed") {
        setSubject("");
        setBody("");
        if (isCustom) clearCustomSelection();
        onSent();
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Send failed." });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminCard className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Compose</h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="audience" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Audience
          </label>
          <select
            id="audience"
            value={audience}
            onChange={(e) => {
              const next = e.target.value as ComposeAudience;
              setAudience(next);
              if (next !== "custom") clearCustomSelection();
            }}
            className="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
          >
            {AUDIENCE_TYPES.map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_CONFIG[a].label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </div>

        {isCustom ? (
          <div className="flex flex-col justify-end">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Recipients</p>
            <p className="mt-1 text-sm text-ink">
              {customRecipients.length} valid recipient{customRecipients.length === 1 ? "" : "s"} parsed
              {customMode === "typed" && invalidTokens.length > 0
                ? `, ${invalidTokens.length} unrecognized`
                : ""}
            </p>
            {customMode === "preloaded" && (
              <button
                type="button"
                onClick={clearCustomSelection}
                className="mt-1 w-fit text-xs font-semibold text-gold-deep hover:opacity-75"
              >
                Clear and type a list instead
              </button>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="status" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Status filter
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
            >
              <option value="all">All statuses</option>
              {config!.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="channel" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Channel
          </label>
          <select
            id="channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as ChannelOption)}
            className="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="both">Both</option>
          </select>
        </div>

        {!isCustom && (
          <div className="flex flex-col justify-end">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Recipients</p>
            <p className="mt-1 text-sm text-ink">
              {countLoading ? "Counting…" : recipientCount === null ? "-" : `${recipientCount} match${recipientCount === 1 ? "" : "es"}`}
            </p>
            <button
              type="button"
              onClick={togglePreview}
              disabled={!recipientCount}
              className="mt-1 w-fit text-xs font-semibold text-gold-deep hover:opacity-75 disabled:opacity-40"
            >
              {previewOpen ? "Hide" : "Preview"} recipients
            </button>
          </div>
        )}
      </div>

      {isCustom && (
        <div className="mt-4">
          <label htmlFor="custom-recipients" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            {customMode === "preloaded" ? "Selected recipients" : "Recipients"}
          </label>
          {customMode === "preloaded" ? (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-hairline bg-paper p-3 text-sm text-ink/80">
              <ul className="space-y-1">
                {preloadedRecipients.map((r, i) => (
                  <li key={i}>
                    {r.name || "(unnamed)"} - {r.email || r.phone}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <textarea
                id="custom-recipients"
                rows={4}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="One email or phone number per line, or comma-separated"
                className="mt-1 w-full resize-y rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
              />
              {invalidTokens.length > 0 && (
                <p className="mt-1 text-xs text-madder">Couldn&apos;t recognize: {invalidTokens.join(", ")}</p>
              )}
            </>
          )}
        </div>
      )}

      {previewOpen && !isCustom && (
        <div className="mt-3 max-h-40 overflow-y-auto rounded-md border border-hairline bg-paper p-3 text-sm text-ink/80">
          {previewLoading ? (
            "Loading…"
          ) : previewNames.length === 0 ? (
            "No recipients."
          ) : (
            <ul className="space-y-1">
              {previewNames.map((name, i) => (
                <li key={i}>{name}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {requiresSubject && (
        <div className="mt-4">
          <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Subject
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
          />
        </div>
      )}

      <div className="mt-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <label htmlFor="body" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Message
          </label>
          {isCustom ? (
            customMode === "preloaded" && (
              <p className="text-xs text-ink/50">Merge fields: {"{{name}}"}</p>
            )
          ) : (
            <p className="text-xs text-ink/50">
              Merge fields: {config!.mergeFields.map((f) => `{{${f}}}`).join(", ")}
            </p>
          )}
        </div>
        {isCustom && customMode === "typed" && (
          <p className="mt-1 text-xs text-ink/50">
            No merge-field personalization is available for typed/pasted recipients - there&apos;s no name data attached to a raw address.
          </p>
        )}
        <textarea
          id="body"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 w-full resize-y rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
        />
      </div>

      {result && (
        <p className={`mt-3 text-sm ${result.ok ? "text-forest" : "text-madder"}`} role="status">
          {result.message}
        </p>
      )}

      {/* Sticky send bar on mobile so count + Send stay reachable */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-4 border-t border-hairline bg-surface/95 px-5 py-3 backdrop-blur-sm md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink">
            {countLoading && !isCustom
              ? "Counting recipients…"
              : recipientCount === null
                ? "-"
                : `${recipientCount} recipient${recipientCount === 1 ? "" : "s"}`}
          </p>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-50 sm:w-auto"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </AdminCard>
  );
}

type CommunicationLogRow = {
  id: string;
  created_at: string;
  channel: string;
  audience_type: string;
  recipient_count: number;
  status: string;
  sent_by: string | null;
  sent_by_email: string | null;
};

type RecipientRow = {
  id: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
};

function formatSenderLabel(row: CommunicationLogRow): string {
  if (row.sent_by_email) return row.sent_by_email;
  // Both null = genuine system-triggered send (no such path yet; label ready).
  if (!row.sent_by && !row.sent_by_email) return "System";
  // Data anomaly: FK present but snapshot missing (pre-migration row that
  // somehow didn't backfill, or insert path skipped the snapshot). Surface
  // the raw fact rather than a vague "Unknown admin".
  return "(missing sender email)";
}

function formatRecipientLabel(r: RecipientRow): string {
  if (r.recipient_name && r.recipient_name.trim()) return r.recipient_name.trim();
  return r.recipient_email || r.recipient_phone || "(no contact info)";
}

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

function History({ refreshToken }: { refreshToken: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<CommunicationLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Distinct from "genuinely zero rows" - a failed query used to fall
  // through to the exact same "No communications sent yet" empty state
  // (console.error only, invisible to anyone not watching devtools), so a
  // real failure and a real empty history were indistinguishable, same
  // class of bug as the News page's empty-state issue. Tracked separately
  // here so the two render differently.
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<CommunicationLogRow | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("communication_log")
      .select("id, created_at, channel, audience_type, recipient_count, status, sent_by, sent_by_email")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("Failed to load communication history:", error);
      setRows([]);
      setLoadError("Failed to load communication history. Please try again.");
      setLoading(false);
      return;
    }
    setRows((data ?? []) as CommunicationLogRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshToken]);

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">History</h2>

      {loadError && (
        <ErrorState
          compact
          title="Could not load history"
          description={loadError}
          onRetry={() => void fetchHistory()}
          className="mt-4 rounded-xl border border-hairline bg-surface"
        />
      )}

      {loading && (
        <>
          <LoadingSkeleton variant="cards" className="mt-3 md:hidden" />
          <LoadingSkeleton variant="table" className="mt-3 hidden md:block" />
        </>
      )}

      {!loading && !loadError && rows.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="No communications sent yet"
          description="Messages you send from the compose form above will appear here with delivery status."
          className="mt-4"
        />
      )}

      <div className={`mt-3 hidden overflow-x-auto rounded-md border border-hairline md:block ${loading || loadError ? "!hidden" : ""}`}>
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-paper">
              {["Sent", "Channel", "Audience", "Recipients", "Status", "Sent By"].map((h) => (
                <th key={h} scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelected(row)}
                className="cursor-pointer border-t border-hairline hover:bg-surface"
              >
                <td className="p-3 text-ink">{formatDateTime(row.created_at)}</td>
                <td className="p-3 text-ink">{row.channel}</td>
                <td className="p-3 text-ink">{row.audience_type}</td>
                <td className="p-3 text-ink">{row.recipient_count}</td>
                <td className="p-3 text-ink">{row.status}</td>
                <td className="p-3 text-ink">{formatSenderLabel(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className={`mt-3 flex flex-col gap-3 md:hidden ${loading || loadError ? "hidden" : ""}`}>
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => setSelected(row)}
              className="w-full rounded-md border border-hairline bg-surface p-4 text-left transition-colors hover:bg-paper"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium capitalize text-ink">
                  {row.channel} → {row.audience_type}
                </span>
                <span
                  className={`inline-flex min-h-8 items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                    row.status === "sent" || row.status === "completed"
                      ? "bg-forest/15 text-forest"
                      : row.status === "failed"
                        ? "bg-madder/15 text-madder"
                        : "bg-ink/10 text-ink/60"
                  }`}
                >
                  {row.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-ink/50">{formatDateTime(row.created_at)}</p>
              <p className="mt-1 text-sm text-ink">
                {row.recipient_count} recipient{row.recipient_count === 1 ? "" : "s"}
                <span className="text-ink/45"> · {formatSenderLabel(row)}</span>
              </p>
              <p className="mt-3 text-xs font-semibold text-gold-deep">View breakdown</p>
            </button>
          </li>
        ))}
      </ul>

      <Modal isOpen={selected !== null} onClose={() => setSelected(null)} titleId="communication-detail-heading" panelClassName="max-w-2xl">
        {selected && <HistoryDetail key={selected.id} log={selected} supabase={supabase} />}
      </Modal>
    </div>
  );
}

function HistoryDetail({ log, supabase }: { log: CommunicationLogRow; supabase: ReturnType<typeof createClient> }) {
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("communication_recipients")
        .select("id, recipient_email, recipient_phone, recipient_name, status, sent_at, error_message")
        .eq("communication_id", log.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) console.error("Failed to load recipient breakdown:", error);
      setRecipients((data ?? []) as RecipientRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, log.id]);

  const handleExportCsv = () => {
    const headers = ["Recipient", "Email", "Phone", "Status", "Sent At", "Error"];
    const rows = recipients.map((r) => [
      formatRecipientLabel(r),
      r.recipient_email ?? "",
      r.recipient_phone ?? "",
      r.status,
      r.sent_at ?? "",
      r.error_message ?? "",
    ]);
    downloadCsv(
      `communication-${log.id.slice(0, 8)}-recipients.csv`,
      headers,
      rows,
    );
  };

  return (
    <div className="p-6 md:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep">Communication</p>
      <h2 id="communication-detail-heading" className="mt-1 pr-8 font-display text-lg font-extrabold uppercase tracking-tight text-ink">
        {log.channel} to {log.audience_type} ({log.recipient_count})
      </h2>
      <p className="mt-2 text-xs text-ink/60">
        {formatDateTime(log.created_at)} · status: {log.status} · sent by: {formatSenderLabel(log)}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
          Recipients{!loading ? ` (${recipients.length})` : ""}
        </p>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={loading || recipients.length === 0}
          className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 py-1.5 text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      <div className="mt-3">
        {loading ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : (
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
            {recipients.map((r) => (
              <AdminCard key={r.id} padding="sm" className="text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{formatRecipientLabel(r)}</p>
                    {(r.recipient_name || (r.recipient_email && r.recipient_phone)) && (
                      <p className="mt-0.5 truncate text-xs text-ink/50">
                        {[r.recipient_email, r.recipient_phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span
                    className={
                      r.status === "sent" ? "shrink-0 text-forest" : r.status === "failed" ? "shrink-0 text-madder" : "shrink-0 text-ink/50"
                    }
                  >
                    {r.status}
                  </span>
                </div>
                {r.error_message && <p className="mt-1 text-xs text-madder">{r.error_message}</p>}
              </AdminCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
