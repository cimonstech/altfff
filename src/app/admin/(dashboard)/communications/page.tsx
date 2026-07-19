"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import { AUDIENCE_CONFIG, AUDIENCE_TYPES, getRecipientDisplayName, type AudienceType } from "@/lib/communications";

type ChannelOption = "email" | "sms" | "both";

function formatDateTime(value: unknown): string {
  if (!value || typeof value !== "string") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminCommunicationsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">Communications</h1>
      <ComposeForm />
      <History />
    </div>
  );
}

function ComposeForm() {
  const supabase = useMemo(() => createClient(), []);
  const [audience, setAudience] = useState<AudienceType>("exhibitor");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState<ChannelOption>("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewNames, setPreviewNames] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const config = AUDIENCE_CONFIG[audience];

  // Reset the status filter whenever the audience changes - the previous
  // audience's status value has no meaning for the new one's check constraint.
  useEffect(() => {
    setStatus("all");
    setPreviewOpen(false);
  }, [audience]);

  const fetchCount = useCallback(async () => {
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
  }, [supabase, config.table, status]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const togglePreview = async () => {
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
      setPreviewNames(previewRows.map((row) => getRecipientDisplayName(audience, row)));
    }
    setPreviewLoading(false);
  };

  const requiresSubject = channel === "email" || channel === "both";
  const canSend = !sending && (recipientCount ?? 0) > 0 && body.trim().length > 0 && (!requiresSubject || subject.trim().length > 0);

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/communications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, status, channel, subject, body }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setResult({ ok: false, message: data.error ?? "Send failed." });
      } else if (data.status === "queued") {
        setResult({ ok: true, message: `Queued for ${data.recipientCount} recipients - processing asynchronously.` });
      } else {
        setResult({ ok: true, message: `Sent - final status: ${data.status}.` });
      }
      if (data.ok) {
        setSubject("");
        setBody("");
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Send failed." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6 rounded-md border border-hairline bg-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Compose</h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="audience" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Audience
          </label>
          <select
            id="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value as AudienceType)}
            className="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
          >
            {AUDIENCE_TYPES.map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_CONFIG[a].label}
              </option>
            ))}
            <option value="custom" disabled>
              Custom (coming soon)
            </option>
          </select>
        </div>

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
            {config.statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

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

        <div className="flex flex-col justify-end">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Recipients</p>
          <p className="mt-1 text-sm text-ink">
            {countLoading ? "Counting…" : recipientCount === null ? "—" : `${recipientCount} match${recipientCount === 1 ? "" : "es"}`}
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
      </div>

      {previewOpen && (
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
        <div className="flex items-baseline justify-between">
          <label htmlFor="body" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Message
          </label>
          <p className="text-xs text-ink/50">
            Merge fields: {config.mergeFields.map((f) => `{{${f}}}`).join(", ")}
          </p>
        </div>
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

      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send"}
      </button>
    </div>
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
};

type RecipientRow = {
  id: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
};

function History() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<CommunicationLogRow[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CommunicationLogRow | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("communication_log")
      .select("id, created_at, channel, audience_type, recipient_count, status, sent_by")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("Failed to load communication history:", error);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as CommunicationLogRow[]);

    const senderIds = Array.from(new Set((data ?? []).map((r) => r.sent_by).filter((id): id is string => !!id)));
    if (senderIds.length > 0) {
      const { data: admins } = await supabase.from("admin_profiles").select("id, full_name").in("id", senderIds);
      const map: Record<string, string> = {};
      (admins ?? []).forEach((a) => {
        map[a.id as string] = (a.full_name as string) || "Unknown admin";
      });
      setSenderNames(map);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">History</h2>

      <div className="mt-3 overflow-x-auto rounded-md border border-hairline">
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
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-ink/60">
                  No communications sent yet.
                </td>
              </tr>
            )}
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
                <td className="p-3 text-ink">{row.sent_by ? senderNames[row.sent_by] ?? "…" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={selected !== null} onClose={() => setSelected(null)} titleId="communication-detail-heading" panelClassName="max-w-lg">
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
        .select("id, recipient_email, recipient_phone, status, sent_at, error_message")
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

  return (
    <div className="p-6 md:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep">Communication</p>
      <h2 id="communication-detail-heading" className="mt-1 pr-8 font-display text-lg font-extrabold uppercase tracking-tight text-ink">
        {log.channel} to {log.audience_type} ({log.recipient_count})
      </h2>
      <p className="mt-2 text-xs text-ink/60">
        {formatDateTime(log.created_at)} · status: {log.status}
      </p>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recipients.map((r) => (
              <div key={r.id} className="rounded-md border border-hairline bg-surface p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink">{r.recipient_email || r.recipient_phone || "(no contact info)"}</span>
                  <span
                    className={
                      r.status === "sent" ? "text-forest" : r.status === "failed" ? "text-madder" : "text-ink/50"
                    }
                  >
                    {r.status}
                  </span>
                </div>
                {r.error_message && <p className="mt-1 text-xs text-madder">{r.error_message}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
