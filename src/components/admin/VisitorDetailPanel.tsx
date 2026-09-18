"use client";

import { useState } from "react";
import InlineErrorMessage from "@/components/ui/states/InlineErrorMessage";
import { formatVisitorSourceLabel, visitorSourcePillClass } from "@/components/admin/adminVisual";

function formatDateTime(value: unknown): string {
  if (!value || typeof value !== "string") return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

type Props = {
  row: Record<string, unknown>;
  onRowUpdated: (row: Record<string, unknown>) => void;
  compact?: boolean;
};

export default function VisitorDetailPanel({ row, onRowUpdated, compact = false }: Props) {
  const [busy, setBusy] = useState<"approve" | "decline" | "resend" | null>(null);
  const [lastAction, setLastAction] = useState<"approve" | "decline" | "resend" | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(
    null,
  );

  const status = typeof row.status === "string" ? row.status : "";
  const source = typeof row.source === "string" ? row.source : "pre_registered";
  const isWalkIn = source === "walk_in";
  const id = row.id as string;
  const qrToken = typeof row.qr_token === "string" ? row.qr_token.trim() : "";
  const canResendConfirmation = status === "confirmed" && qrToken.length > 0;
  const qrIssuedAt = typeof row.qr_issued_at === "string" ? row.qr_issued_at : null;
  const checkedInAt = typeof row.checked_in_at === "string" ? row.checked_in_at : null;
  const checkedInBy = typeof row.checked_in_by_email === "string" ? row.checked_in_by_email : null;

  const runAction = async (action: "approve" | "decline") => {
    const label = action === "approve" ? "Approve" : "Decline";
    if (!window.confirm(`${label} this visitor registration? An email will be sent.`)) return;

    setBusy(action);
    setActionMessage(null);
    setLastAction(null);
    try {
      const res = await fetch(`/api/admin/visitors/${id}/${action}`, { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        row?: Record<string, unknown>;
        error?: string;
        warning?: string;
      };
      if (!res.ok || !data.ok || !data.row) {
        setLastAction(action);
        setActionMessage({ tone: "error", text: data.error || `${label} failed.` });
        return;
      }
      onRowUpdated(data.row);
      setLastAction(action);
      if (data.warning) {
        setActionMessage({ tone: "warn", text: data.warning });
      } else {
        setActionMessage({
          tone: "ok",
          text: action === "approve" ? "Approved - QR email sent." : "Declined - notification email sent.",
        });
      }
    } catch {
      setLastAction(action);
      setActionMessage({ tone: "error", text: `${label} failed - network error.` });
    } finally {
      setBusy(null);
    }
  };

  const runResendConfirmation = async () => {
    if (
      !window.confirm(
        "Resend the original confirmation email with the same QR code and PDF ticket? Their existing entry code will not change.",
      )
    ) {
      return;
    }

    setBusy("resend");
    setActionMessage(null);
    setLastAction(null);
    try {
      const res = await fetch(`/api/admin/visitors/${id}/resend-confirmation`, { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        row?: Record<string, unknown>;
        error?: string;
        warning?: string;
      };
      if (!res.ok || !data.ok) {
        setLastAction("resend");
        setActionMessage({ tone: "error", text: data.error || "Resend failed." });
        return;
      }
      if (data.row) onRowUpdated(data.row);
      setLastAction("resend");
      if (data.warning) {
        setActionMessage({ tone: "warn", text: data.warning });
      } else {
        setActionMessage({ tone: "ok", text: "Confirmation email resent with the same QR code." });
      }
    } catch {
      setLastAction("resend");
      setActionMessage({ tone: "error", text: "Resend failed - network error." });
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
      {isWalkIn && (
        <div className="rounded-md border border-forest/30 bg-forest/10 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink">Walk-in registration</p>
            <span
              className={`inline-flex min-h-6 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${visitorSourcePillClass(source)}`}
            >
              {formatVisitorSourceLabel(source)}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink/60">
            Registered on-site and confirmed automatically. No QR code and no admin review step.
          </p>
        </div>
      )}

      {status === "registered" && !isWalkIn && (
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
          {actionMessage?.tone === "error" && (lastAction === "approve" || lastAction === "decline") && (
            <InlineErrorMessage
              className="mt-2"
              message={actionMessage.text}
              onRetry={() => lastAction && void runAction(lastAction)}
            />
          )}
          {actionMessage && actionMessage.tone !== "error" && (lastAction === "approve" || lastAction === "decline") && (
            <p className={`mt-2 text-sm ${messageClass}`}>{actionMessage.text}</p>
          )}
        </div>
      )}

      {canResendConfirmation && (
        <div className="rounded-md border border-forest/30 bg-forest/10 p-4">
          <p className="text-sm font-medium text-ink">Confirmed visitor</p>
          <p className="mt-1 text-xs text-ink/60">
            Resend the original confirmation email with the same QR code and PDF ticket. This does not issue a new
            entry code.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => void runResendConfirmation()}
              disabled={busy !== null}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-50"
            >
              {busy === "resend" ? "Sending…" : "Resend confirmation email"}
            </button>
          </div>
          {actionMessage?.tone === "error" && lastAction === "resend" && (
            <InlineErrorMessage
              className="mt-2"
              message={actionMessage.text}
              onRetry={() => void runResendConfirmation()}
            />
          )}
          {actionMessage && lastAction === "resend" && actionMessage.tone !== "error" && (
            <p className={`mt-2 text-sm ${messageClass}`}>{actionMessage.text}</p>
          )}
        </div>
      )}

      {!compact && !isWalkIn && (
        <div className="rounded-md border border-hairline bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/60">QR &amp; check-in</h3>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink/50">QR issued</dt>
              <dd className="mt-0.5 text-ink">
                {qrIssuedAt ? formatDateTime(qrIssuedAt) : status === "confirmed" ? "-" : "Not yet"}
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
                <dd className="mt-0.5 text-ink">{checkedInBy || "-"}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
