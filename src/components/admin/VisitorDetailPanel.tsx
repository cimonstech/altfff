"use client";

import { useState } from "react";

function formatDateTime(value: unknown): string {
  if (!value || typeof value !== "string") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

type Props = {
  row: Record<string, unknown>;
  onRowUpdated: (row: Record<string, unknown>) => void;
  compact?: boolean;
};

export default function VisitorDetailPanel({ row, onRowUpdated, compact = false }: Props) {
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(
    null,
  );

  const status = typeof row.status === "string" ? row.status : "";
  const id = row.id as string;
  const qrIssuedAt = typeof row.qr_issued_at === "string" ? row.qr_issued_at : null;
  const checkedInAt = typeof row.checked_in_at === "string" ? row.checked_in_at : null;
  const checkedInBy = typeof row.checked_in_by_email === "string" ? row.checked_in_by_email : null;

  const runAction = async (action: "approve" | "decline") => {
    const label = action === "approve" ? "Approve" : "Decline";
    if (!window.confirm(`${label} this visitor registration? An email will be sent.`)) return;

    setBusy(action);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/visitors/${id}/${action}`, { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        row?: Record<string, unknown>;
        error?: string;
        warning?: string;
      };
      if (!res.ok || !data.ok || !data.row) {
        setActionMessage({ tone: "error", text: data.error || `${label} failed.` });
        return;
      }
      onRowUpdated(data.row);
      if (data.warning) {
        setActionMessage({ tone: "warn", text: data.warning });
      } else {
        setActionMessage({
          tone: "ok",
          text: action === "approve" ? "Approved — QR email sent." : "Declined — notification email sent.",
        });
      }
    } catch {
      setActionMessage({ tone: "error", text: `${label} failed — network error.` });
    } finally {
      setBusy(null);
    }
  };

  const messageClass =
    actionMessage?.tone === "ok"
      ? "text-forest"
      : actionMessage?.tone === "warn"
        ? "text-gold-deep"
        : "text-madder";

  return (
    <div className={compact ? "space-y-3" : "mt-5 space-y-4"}>
      {status === "registered" && (
        <div className="rounded-md border border-gold/30 bg-gold/10 p-4">
          <p className="text-sm font-medium text-ink">Pending review</p>
          <p className="mt-1 text-xs text-ink/60">
            Approve to issue a QR code by email, or decline to notify the visitor.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runAction("approve")}
              disabled={busy !== null}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-50"
            >
              {busy === "approve" ? "Approving…" : "Approve & send QR"}
            </button>
            <button
              type="button"
              onClick={() => void runAction("decline")}
              disabled={busy !== null}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-madder/40 bg-paper px-5 py-2 text-sm font-semibold text-madder hover:bg-madder/5 disabled:opacity-50"
            >
              {busy === "decline" ? "Declining…" : "Decline"}
            </button>
          </div>
          {actionMessage && <p className={`mt-2 text-sm ${messageClass}`}>{actionMessage.text}</p>}
        </div>
      )}

      {!compact && (
        <div className="rounded-md border border-hairline bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/60">QR &amp; check-in</h3>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink/50">QR issued</dt>
              <dd className="mt-0.5 text-ink">
                {qrIssuedAt ? formatDateTime(qrIssuedAt) : status === "confirmed" ? "—" : "Not yet"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink/50">Checked in</dt>
              <dd className="mt-0.5 text-ink">
                {checkedInAt ? formatDateTime(checkedInAt) : "Not yet"}
              </dd>
            </div>
            {checkedInAt && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink/50">Checked in by</dt>
                <dd className="mt-0.5 text-ink">{checkedInBy || "—"}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
