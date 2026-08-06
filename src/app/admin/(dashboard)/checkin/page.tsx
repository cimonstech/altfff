"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { normalizeCheckInToken, QR_TOKEN_PREFIX } from "@/lib/qrToken";

type ScanResult =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; name: string; message: string }
  | { kind: "warning"; name?: string; message: string }
  | { kind: "error"; name?: string; message: string };

type CheckInStats = { approved: number; checkedIn: number };

const SCANNER_ID = "admin-checkin-scanner";

export default function AdminCheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState<ScanResult>({ kind: "idle" });
  const [stats, setStats] = useState<CheckInStats | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/checkin/stats");
      if (!res.ok) return;
      const data = (await res.json()) as CheckInStats & { ok?: boolean };
      if (data.ok !== false) {
        setStats({ approved: data.approved ?? 0, checkedIn: data.checkedIn ?? 0 });
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  const handleToken = useCallback(
    async (raw: string) => {
      const token = raw.trim();
      if (!token || processingRef.current) return;
      processingRef.current = true;
      setResult({ kind: "loading" });

      try {
        const res = await fetch("/api/admin/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          result?: string;
          message?: string;
          name?: string;
        };

        const message = data.message || "Unknown response.";
        const name = data.name;

        if (data.ok && data.result === "checked_in") {
          setResult({ kind: "success", name: name || "Visitor", message });
          void refreshStats();
        } else if (data.result === "already_checked_in") {
          setResult({ kind: "warning", name, message });
        } else {
          setResult({ kind: "error", name, message });
        }
      } catch {
        setResult({ kind: "error", message: "Network error - try again." });
      } finally {
        processingRef.current = false;
        window.setTimeout(() => setResult({ kind: "idle" }), 8000);
      }
    },
    [refreshStats],
  );

  useEffect(() => {
    void refreshStats();
    const interval = window.setInterval(() => void refreshStats(), 30_000);
    return () => window.clearInterval(interval);
  }, [refreshStats]);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    (async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
          (decoded) => {
            void handleToken(decoded);
          },
          () => {
            /* scan frame miss - ignore */
          },
        );
        if (!cancelled) setCameraReady(true);
      } catch (err) {
        console.error("Camera start failed:", err);
        if (!cancelled) {
          setCameraError("Could not access the camera. Allow camera permission and reload.");
        }
      }
    })();

    return () => {
      cancelled = true;
      void scanner.stop().catch(() => undefined);
      scannerRef.current = null;
    };
  }, [handleToken]);

  const resultPanel =
    result.kind === "idle" ? null : result.kind === "loading" ? (
      <div className="rounded-xl border-2 border-ink/20 bg-ink/5 p-6 text-center">
        <p className="text-lg font-semibold text-ink">Checking…</p>
      </div>
    ) : result.kind === "success" ? (
      <div className="rounded-xl border-2 border-forest bg-forest/10 p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-forest">Checked in</p>
        <p className="mt-2 font-display text-2xl font-extrabold uppercase text-ink">{result.name}</p>
        <p className="mt-2 text-base text-ink/80">{result.message}</p>
      </div>
    ) : result.kind === "warning" ? (
      <div className="rounded-xl border-2 border-gold bg-gold/15 p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-gold-deep">Already checked in</p>
        {result.name && (
          <p className="mt-2 font-display text-xl font-extrabold uppercase text-ink">{result.name}</p>
        )}
        <p className="mt-2 text-base font-medium text-ink">{result.message}</p>
      </div>
    ) : (
      <div className="rounded-xl border-2 border-madder bg-madder/10 p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-madder">Not admitted</p>
        {result.name && <p className="mt-2 text-lg font-semibold text-ink">{result.name}</p>}
        <p className="mt-2 text-base font-medium text-ink">{result.message}</p>
      </div>
    );

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">Check-in</h1>
          <p className="mt-1 text-sm text-ink/60">Scan visitor QR codes at the door.</p>
        </div>
        {stats && (
          <p className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink">
            {stats.checkedIn} of {stats.approved} checked in
          </p>
        )}
      </div>

      {cameraError && (
        <p className="mt-4 rounded-md border border-madder/30 bg-madder/10 p-4 text-sm text-madder" role="alert">
          {cameraError}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border-2 border-ink bg-black">
        <div id={SCANNER_ID} className="w-full [&_video]:!w-full [&_video]:!object-cover" />
        {!cameraReady && !cameraError && (
          <p className="bg-black p-4 text-center text-sm text-paper/70">Starting camera…</p>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-ink/50">Point the camera at the QR code in the visitor&apos;s email.</p>

      {resultPanel && <div className="mt-6">{resultPanel}</div>}

      <details className="mt-8 rounded-md border border-hairline bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Manual code entry (fallback)</summary>
        <p className="mt-2 text-xs text-ink/55">Type only the code from the visitor&apos;s email - the prefix is added automatically.</p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const code = String(fd.get("code") ?? "").trim();
            if (!code) {
              setResult({ kind: "error", message: "Enter the entry code." });
              window.setTimeout(() => setResult({ kind: "idle" }), 4000);
              return;
            }
            const token = normalizeCheckInToken(code);
            void handleToken(token);
          }}
        >
          <div className="flex min-h-11 flex-1 overflow-hidden rounded-md border border-hairline bg-paper focus-within:border-gold">
            <span className="flex items-center bg-surface px-3 font-mono text-sm font-semibold text-ink/70">{QR_TOKEN_PREFIX}</span>
            <input
              name="code"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="XXXXXXXX"
              className="min-w-0 flex-1 bg-paper px-3 font-mono text-base uppercase text-ink outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-paper"
          >
            Check in
          </button>
        </form>
      </details>
    </div>
  );
}
