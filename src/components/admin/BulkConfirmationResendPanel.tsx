"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminCard from "@/components/admin/AdminCard";
import InlineErrorMessage from "@/components/ui/states/InlineErrorMessage";

type BulkResendSummary = {
  batchId: string;
  status: string;
  mode: string;
  createdAt: string;
  sentByEmail: string | null;
  resumeFromBatchId: string | null;
  counts: {
    total: number;
    queued: number;
    sent: number;
    quota_exceeded: number;
    failed: number;
    pending: number;
  };
  quotaExceeded: Array<{ visitorId: string; name: string | null; email: string | null }>;
  failed: Array<{ visitorId: string; name: string | null; email: string | null; error: string }>;
};

type PausedBatch = {
  id: string;
  created_at: string;
  recipient_count: number;
  resume_from_batch_id: string | null;
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function isBatchDone(summary: BulkResendSummary): boolean {
  return summary.counts.pending === 0 && summary.status !== "processing" && summary.status !== "queuing";
}

export default function BulkConfirmationResendPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(true);
  const [pausedBatch, setPausedBatch] = useState<PausedBatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [summary, setSummary] = useState<BulkResendSummary | null>(null);
  const [polling, setPolling] = useState(false);

  const loadTargets = useCallback(async () => {
    setCountLoading(true);
    const { count, error: countError } = await supabase
      .from("visitor_registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .not("qr_token", "is", null)
      .neq("source", "walk_in");

    if (countError) {
      console.error("Failed to count bulk resend targets:", countError);
      setTargetCount(null);
    } else {
      setTargetCount(count ?? 0);
    }

    const { data: paused, error: pausedError } = await supabase
      .from("bulk_confirmation_resend_batch")
      .select("id, created_at, recipient_count, resume_from_batch_id")
      .eq("status", "paused_quota")
      .order("created_at", { ascending: false })
      .limit(5);

    if (pausedError) {
      console.error("Failed to load paused bulk resend batch:", pausedError);
      setPausedBatch(null);
    } else {
      const rows = (paused as PausedBatch[] | null) ?? [];
      setPausedBatch(rows[0] ?? null);
    }

    setCountLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  const fetchSummary = useCallback(async (batchId: string) => {
    const res = await fetch(`/api/admin/visitors/bulk-resend-confirmation/${batchId}/summary`);
    const data = (await res.json()) as { ok?: boolean; summary?: BulkResendSummary; error?: string };
    if (!res.ok || !data.ok || !data.summary) {
      throw new Error(data.error ?? "Failed to load batch summary.");
    }
    setSummary(data.summary);
    return data.summary;
  }, []);

  useEffect(() => {
    if (!activeBatchId) return;

    let cancelled = false;
    setPolling(true);

    const poll = async () => {
      try {
        const next = await fetchSummary(activeBatchId);
        if (cancelled) return;
        if (isBatchDone(next)) {
          setPolling(false);
          await loadTargets();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to refresh batch summary.");
          setPolling(false);
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeBatchId, fetchSummary, loadTargets]);

  const startBatch = async (mode: "all_confirmed" | "resume_quota", resumeFromBatchId?: string) => {
    const label =
      mode === "resume_quota"
        ? "Resume bulk resend for visitors whose last attempt hit the daily email quota?"
        : `Resend QR confirmation emails to all ${targetCount ?? "confirmed"} pre-registered confirmed visitors? Walk-ins are excluded. Existing QR tokens are reused — no new codes are issued.`;

    if (!window.confirm(label)) return;

    setBusy(true);
    setError("");
    setSummary(null);

    try {
      const payload =
        mode === "resume_quota"
          ? { mode, resumeFromBatchId: resumeFromBatchId ?? pausedBatch?.id }
          : { mode };

      const res = await fetch("/api/admin/visitors/bulk-resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        batchId?: string;
        summary?: BulkResendSummary;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.batchId) {
        setError(data.error ?? "Bulk resend failed to start.");
        return;
      }

      setActiveBatchId(data.batchId);
      if (data.summary) {
        setSummary(data.summary);
        if (isBatchDone(data.summary)) {
          setPolling(false);
          await loadTargets();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk resend failed to start.");
    } finally {
      setBusy(false);
    }
  };

  const summaryDone = summary ? isBatchDone(summary) : false;

  return (
    <AdminCard>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Bulk resend confirmations</h2>
      <p className="mt-2 text-sm text-ink/70">
        Re-send the existing QR confirmation email to every confirmed pre-registered visitor. Uses the same QStash
        fan-out as Communications — each visitor is processed independently. Outcomes are recorded in{" "}
        <span className="font-medium">Messages</span> with type &ldquo;Bulk confirmation resend&rdquo;.
      </p>

      <p className="mt-3 text-sm text-ink">
        {countLoading
          ? "Counting eligible visitors…"
          : targetCount === null
            ? "Could not count eligible visitors."
            : `${targetCount} confirmed pre-registered visitor${targetCount === 1 ? "" : "s"} with QR codes`}
      </p>

      {error && <InlineErrorMessage className="mt-3" message={error} />}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void startBatch("all_confirmed")}
          disabled={busy || countLoading || !targetCount || polling}
          className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {busy ? "Starting…" : "Resend to all confirmed"}
        </button>

        {pausedBatch && (
          <button
            type="button"
            onClick={() => void startBatch("resume_quota", pausedBatch.id)}
            disabled={busy || polling}
            className="inline-flex min-h-11 items-center rounded-full border border-gold/40 bg-gold/10 px-5 py-2.5 text-sm font-semibold text-gold-deep transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            Resume quota-paused batch
          </button>
        )}
      </div>

      {pausedBatch && !summary && (
        <p className="mt-3 text-xs text-ink/60">
          A batch from {formatDateTime(pausedBatch.created_at)} paused on Resend&apos;s daily quota (
          {pausedBatch.recipient_count} queued). Resume after quota resets to continue without re-sending to people
          who already succeeded.
        </p>
      )}

      {summary && (
        <div className="mt-6 rounded-md border border-hairline bg-paper p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Batch summary</p>
            <p className="text-xs text-ink/50">
              {formatDateTime(summary.createdAt)}
              {summary.sentByEmail ? ` · ${summary.sentByEmail}` : ""}
              {polling ? " · updating…" : ""}
            </p>
          </div>

          <p className="mt-2 text-sm text-ink">
            Status: <span className="font-medium capitalize">{summary.status.replace(/_/g, " ")}</span>
            {summary.mode === "resume_quota" && summary.resumeFromBatchId
              ? ` · resumed from ${summary.resumeFromBatchId.slice(0, 8)}…`
              : ""}
          </p>

          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <li className="rounded-md bg-forest/10 px-3 py-2 text-forest">
              <span className="block text-xs uppercase tracking-wide opacity-80">Sent</span>
              <span className="text-lg font-semibold">{summary.counts.sent}</span>
            </li>
            <li className="rounded-md bg-gold/15 px-3 py-2 text-gold-deep">
              <span className="block text-xs uppercase tracking-wide opacity-80">Quota exceeded</span>
              <span className="text-lg font-semibold">{summary.counts.quota_exceeded}</span>
            </li>
            <li className="rounded-md bg-madder/10 px-3 py-2 text-madder">
              <span className="block text-xs uppercase tracking-wide opacity-80">Failed</span>
              <span className="text-lg font-semibold">{summary.counts.failed}</span>
            </li>
            <li className="rounded-md bg-ink/5 px-3 py-2 text-ink/70">
              <span className="block text-xs uppercase tracking-wide opacity-80">Pending</span>
              <span className="text-lg font-semibold">{summary.counts.pending}</span>
            </li>
          </ul>

          {summaryDone && summary.counts.quota_exceeded > 0 && (
            <p className="mt-3 text-sm text-gold-deep">
              Daily email quota was reached partway through. Use &ldquo;Resume quota-paused batch&rdquo; after quota
              resets — only quota-exceeded recipients will be retried.
            </p>
          )}

          {summary.quotaExceeded.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                Quota exceeded ({summary.quotaExceeded.length})
              </p>
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-sm text-ink/80">
                {summary.quotaExceeded.map((row) => (
                  <li key={row.visitorId}>
                    {row.name || "(unnamed)"} — {row.email || row.visitorId.slice(0, 8)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.failed.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                Failed ({summary.failed.length})
              </p>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-sm">
                {summary.failed.map((row) => (
                  <li key={row.visitorId} className="rounded-md border border-madder/20 bg-madder/5 px-3 py-2">
                    <p className="font-medium text-ink">
                      {row.name || "(unnamed)"} — {row.email || row.visitorId.slice(0, 8)}
                    </p>
                    <p className="mt-0.5 text-xs text-madder">{row.error}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-xs text-ink/50">
            Batch id: {summary.batchId} · view full log under{" "}
            <a href="/admin/messages" className="font-semibold text-gold-deep hover:opacity-75">
              Messages
            </a>
          </p>
        </div>
      )}
    </AdminCard>
  );
}
