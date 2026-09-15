"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { normalizeCheckInToken, QR_TOKEN_PREFIX } from "@/lib/qrToken";

type ScanResult =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; name: string; message: string }
  | { kind: "warning"; name?: string; message: string }
  | { kind: "error"; name?: string; message: string };

type CheckInStats = { approved: number; checkedIn: number };

type LookupVisitor = {
  id: string;
  full_name: string | null;
  email: string;
  status: string;
  checked_in_at: string | null;
  checked_in_by_email: string | null;
};

const SCANNER_ID = "admin-checkin-scanner";
const SCAN_CONFIG = { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 };

function cameraFailureMessage(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "The camera will not start on an insecure (http) address. Open this page on https://www.altfff.com, or look the visitor up below.";
  }
  const text = err instanceof Error ? err.message : String(err ?? "");
  if (/permission|notallowed|denied/i.test(text)) {
    return "Camera permission was blocked. Allow the camera for this site, tap Start camera, or look the visitor up below.";
  }
  if (/not supported|streaming not supported/i.test(text)) {
    return "This browser could not start the camera. Use Safari or Chrome with camera allowed, or look the visitor up below.";
  }
  return "Could not start the camera. Allow camera permission, tap Start camera, or look the visitor up below.";
}

async function startScanner(scanner: Html5Qrcode, onDecoded: (text: string) => void) {
  const onScan = (decoded: string) => onDecoded(decoded);
  const onMiss = () => {
    /* scan frame miss - ignore */
  };

  try {
    await scanner.start({ facingMode: "environment" }, SCAN_CONFIG, onScan, onMiss);
    return;
  } catch {
    // Some phones reject facingMode and need an explicit device id.
  }

  const cameras = await Html5Qrcode.getCameras();
  if (cameras.length === 0) {
    throw new Error("Camera streaming not supported by the browser.");
  }
  const rear =
    cameras.find((camera) => /back|rear|environment|wide/i.test(camera.label)) ?? cameras[cameras.length - 1];
  await scanner.start(rear.id, SCAN_CONFIG, onScan, onMiss);
}

async function stopScanner(scanner: Html5Qrcode) {
  try {
    const state = scanner.getState();
    if (state !== Html5QrcodeScannerState.SCANNING && state !== Html5QrcodeScannerState.PAUSED) {
      return;
    }
    await scanner.stop();
  } catch {
    // start() may still be in flight, or the camera never came up.
  }
}

function formatLookupTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminCheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState<ScanResult>({ kind: "idle" });
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResults, setLookupResults] = useState<LookupVisitor[] | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [cameraStarting, setCameraStarting] = useState(true);

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

  const applyCheckInResponse = useCallback(
    (
      data: {
        ok?: boolean;
        result?: string;
        message?: string;
        name?: string;
        checkedInAt?: string | null;
      },
      visitorId?: string,
    ) => {
      const message = data.message || "Unknown response.";
      const name = data.name;

      if (data.ok && data.result === "checked_in") {
        setResult({ kind: "success", name: name || "Visitor", message });
        if (visitorId) {
          const checkedInAt = data.checkedInAt ?? new Date().toISOString();
          setLookupResults((prev) =>
            prev
              ? prev.map((row) => (row.id === visitorId ? { ...row, checked_in_at: checkedInAt } : row))
              : prev,
          );
        }
        void refreshStats();
      } else if (data.result === "already_checked_in") {
        setResult({ kind: "warning", name, message });
        if (visitorId && data.checkedInAt) {
          setLookupResults((prev) =>
            prev
              ? prev.map((row) =>
                  row.id === visitorId ? { ...row, checked_in_at: data.checkedInAt ?? row.checked_in_at } : row,
                )
              : prev,
          );
        }
      } else {
        setResult({ kind: "error", name, message });
      }
    },
    [refreshStats],
  );

  const postCheckIn = useCallback(
    async (payload: { token: string } | { visitorId: string }) => {
      if (processingRef.current) return;
      processingRef.current = true;
      const visitorId = "visitorId" in payload ? payload.visitorId : undefined;
      if (visitorId) setCheckingInId(visitorId);
      setResult({ kind: "loading" });

      try {
        const res = await fetch("/api/admin/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          result?: string;
          message?: string;
          name?: string;
          checkedInAt?: string | null;
        };
        applyCheckInResponse(data, visitorId);
      } catch {
        setResult({ kind: "error", message: "Network error - try again." });
      } finally {
        processingRef.current = false;
        setCheckingInId(null);
        window.setTimeout(() => setResult({ kind: "idle" }), 8000);
      }
    },
    [applyCheckInResponse],
  );

  const handleToken = useCallback(
    async (raw: string) => {
      const token = raw.trim();
      if (!token) return;
      await postCheckIn({ token });
    },
    [postCheckIn],
  );
  const handleTokenRef = useRef(handleToken);
  handleTokenRef.current = handleToken;

  const runLookup = useCallback(async () => {
    const q = lookupQuery.trim();
    if (q.length < 2) {
      setLookupError("Type at least two characters.");
      setLookupResults(null);
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    try {
      const res = await fetch(`/api/admin/checkin/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        visitors?: LookupVisitor[];
      };
      if (!res.ok || !data.ok) {
        setLookupError(data.error || "Search failed. Try again.");
        setLookupResults(null);
        return;
      }
      setLookupResults(data.visitors ?? []);
    } catch {
      setLookupError("Network error - try again.");
      setLookupResults(null);
    } finally {
      setLookupLoading(false);
    }
  }, [lookupQuery]);

  useEffect(() => {
    void refreshStats();
    const interval = window.setInterval(() => void refreshStats(), 30_000);
    return () => window.clearInterval(interval);
  }, [refreshStats]);

  const startCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    setCameraStarting(true);
    setCameraError("");
    try {
      await startScanner(scanner, (decoded) => {
        void handleTokenRef.current(decoded);
      });
      setCameraReady(true);
      setCameraError("");
    } catch (err) {
      console.warn("Camera start failed:", err);
      setCameraReady(false);
      setCameraError(cameraFailureMessage(err));
    } finally {
      setCameraStarting(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    void (async () => {
      if (cancelled) return;
      await startCamera();
    })();

    return () => {
      cancelled = true;
      void stopScanner(scanner);
      scannerRef.current = null;
    };
  }, [startCamera]);

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
    <div className="mx-auto max-w-xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">Check-in</h1>
          <p className="mt-1 text-sm text-ink/60">
            Scan visitor QR codes at the door, or look up an approved visitor who lost theirs.
          </p>
        </div>
        {stats && (
          <p className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink">
            {stats.checkedIn} of {stats.approved} checked in
          </p>
        )}
      </div>

      {cameraError && (
        <div className="mt-4 rounded-md border border-madder/30 bg-madder/10 p-4" role="alert">
          <p className="text-sm text-madder">{cameraError}</p>
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={cameraStarting}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-paper disabled:opacity-50"
          >
            {cameraStarting ? "Starting…" : "Start camera"}
          </button>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border-2 border-ink bg-black">
        <div id={SCANNER_ID} className="w-full [&_video]:!w-full [&_video]:!object-cover" />
        {!cameraReady && !cameraError && (
          <p className="bg-black p-4 text-center text-sm text-paper/70">Starting camera…</p>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-ink/50">Point the camera at the QR code in the visitor&apos;s email.</p>

      {resultPanel && <div className="mt-6">{resultPanel}</div>}

      <section className="mt-8 rounded-xl border border-hairline bg-surface p-4" aria-labelledby="lost-qr-heading">
        <h2 id="lost-qr-heading" className="text-sm font-semibold text-ink">
          Lost QR — search by name or email
        </h2>
        <p className="mt-1 text-xs text-ink/55">
          For approved visitors who already registered but cannot show their QR. This checks in their existing
          record — it does not create a walk-in.
        </p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch"
          onSubmit={(e) => {
            e.preventDefault();
            void runLookup();
          }}
        >
          <input
            type="search"
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            autoComplete="off"
            placeholder="Name or email"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-hairline bg-paper px-3 text-base text-ink outline-none focus-visible:border-gold"
          />
          <button
            type="submit"
            disabled={lookupLoading}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-paper disabled:opacity-50"
          >
            {lookupLoading ? "Searching…" : "Find"}
          </button>
        </form>
        {lookupError && (
          <p className="mt-3 text-sm text-madder" role="alert">
            {lookupError}
          </p>
        )}
        {lookupResults && lookupResults.length === 0 && !lookupLoading && (
          <p className="mt-3 text-sm text-ink/60">No approved visitors match that name or email.</p>
        )}
        {lookupResults && lookupResults.length > 0 && (
          <ul className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-paper">
            {lookupResults.map((visitor) => {
              const alreadyIn = Boolean(visitor.checked_in_at);
              const displayName = visitor.full_name?.trim() || visitor.email;
              return (
                <li key={visitor.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{displayName}</p>
                    <p className="mt-0.5 truncate text-sm text-ink/60">{visitor.email}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-ink/45">
                      {visitor.status}
                      {alreadyIn && visitor.checked_in_at
                        ? ` · Already checked in at ${formatLookupTime(visitor.checked_in_at)}`
                        : " · Not checked in"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={checkingInId !== null}
                    onClick={() => void postCheckIn({ visitorId: visitor.id })}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-50"
                  >
                    {checkingInId === visitor.id ? "Checking in…" : "Check in"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
