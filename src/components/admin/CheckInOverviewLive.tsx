"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AuthChangeEvent, RealtimeChannel, Session } from "@supabase/supabase-js";
import { Download, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AdminCard from "@/components/admin/AdminCard";
import {
  checkInOverviewListHref,
  fetchCheckInOverviewCounts,
  fetchCheckInOverviewListOrThrow,
  type CheckInOverviewCounts,
} from "@/lib/checkInOverview";

export type { CheckInOverviewCounts };

const CHANNEL_NAME = "admin-checkin-overview";
const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 30000;

type RealtimeProbe = {
  subscribed: boolean;
  connecting: boolean;
  reconnectAttempt: number;
  lastStatus: string | null;
  disconnectTransport: () => void;
};

declare global {
  interface Window {
    __altfffCheckinOverviewRealtimeProbe?: RealtimeProbe;
  }
}

async function refetchOverviewCounts(
  supabase: ReturnType<typeof createClient>,
): Promise<CheckInOverviewCounts | null> {
  try {
    return await fetchCheckInOverviewCounts(supabase);
  } catch (err) {
    console.error("[CheckInOverview] count query failed", err);
    return null;
  }
}

export default function CheckInOverviewLive({
  initialCounts,
  variant = "page",
  compact = false,
}: {
  initialCounts: CheckInOverviewCounts;
  variant?: "page" | "embed";
  /** Denser cards for the main admin Overview page. */
  compact?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [counts, setCounts] = useState(initialCounts);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  const refetchCounts = useCallback(async () => {
    const next = await refetchOverviewCounts(supabase);
    if (next) setCounts(next);
  }, [supabase]);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refetchCounts();
    }, 150);
  }, [refetchCounts]);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let subscribed = false;
    let connecting = false;
    let intentionalTeardown = false;

    const probeState = {
      subscribed: false,
      connecting: false,
      reconnectAttempt: 0,
      lastStatus: null as string | null,
    };

    if (process.env.NODE_ENV === "development") {
      window.__altfffCheckinOverviewRealtimeProbe = {
        get subscribed() {
          return probeState.subscribed;
        },
        get connecting() {
          return probeState.connecting;
        },
        get reconnectAttempt() {
          return probeState.reconnectAttempt;
        },
        get lastStatus() {
          return probeState.lastStatus;
        },
        disconnectTransport: () => {
          void supabase.realtime.disconnect();
        },
      };
    }

    const syncRealtimeAuth = async (accessToken?: string | null) => {
      if (accessToken !== undefined) {
        await supabase.realtime.setAuth(accessToken);
        return;
      }
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
      subscribed = false;
      await supabase.removeChannel(existing);
      intentionalTeardown = false;
    };

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
      reconnectAttempt += 1;
      probeState.reconnectAttempt = reconnectAttempt;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void subscribeChannel();
      }, delay);
    };

    const subscribeChannel = async () => {
      if (cancelled || connecting) return;
      connecting = true;
      probeState.connecting = true;
      clearReconnectTimer();

      try {
        await teardownChannel();
        await syncRealtimeAuth();
        if (cancelled) return;

        const nextChannel = supabase
          .channel(CHANNEL_NAME)
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
        nextChannel.subscribe((status, err) => {
          if (cancelled) return;
          probeState.lastStatus = status;

          if (status === "SUBSCRIBED") {
            subscribed = true;
            probeState.subscribed = true;
            reconnectAttempt = 0;
            probeState.reconnectAttempt = 0;
            if (process.env.NODE_ENV === "development") {
              console.warn("[CheckInOverview] Realtime channel subscribed (counts live).");
            }
            return;
          }

          subscribed = false;
          probeState.subscribed = false;
          if (intentionalTeardown) return;

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            console.warn("[CheckInOverview] Realtime channel dropped:", status, err ?? "");
            queueMicrotask(() => scheduleReconnect());
          }
        });
      } finally {
        connecting = false;
        probeState.connecting = false;
      }
    };

    const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      if (cancelled) return;

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await supabase.realtime.setAuth(session?.access_token ?? null);
        if (!subscribed) scheduleReconnect();
        return;
      }

      if (event === "SIGNED_OUT") {
        clearReconnectTimer();
        reconnectAttempt = 0;
        await teardownChannel();
        await supabase.realtime.setAuth(null);
      }
    };

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      void handleAuthChange(event, session);
    });

    const recoverConnection = () => {
      if (cancelled || subscribed || connecting) return;
      scheduleReconnect();
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      void (async () => {
        await supabase.auth.getSession();
        await syncRealtimeAuth();
        if (!subscribed) scheduleReconnect();
      })();
    };

    window.addEventListener("online", recoverConnection);
    document.addEventListener("visibilitychange", onVisibility);
    void subscribeChannel();

    return () => {
      cancelled = true;
      authSubscription.unsubscribe();
      clearReconnectTimer();
      window.removeEventListener("online", recoverConnection);
      document.removeEventListener("visibilitychange", onVisibility);
      if (process.env.NODE_ENV === "development") {
        delete window.__altfffCheckinOverviewRealtimeProbe;
      }
      void teardownChannel();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [supabase, scheduleRefetch]);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const [preRegistered, checkedIn, walkIns] = await Promise.all([
        fetchCheckInOverviewListOrThrow(supabase, "preRegistered"),
        fetchCheckInOverviewListOrThrow(supabase, "checkedIn"),
        fetchCheckInOverviewListOrThrow(supabase, "walkIns"),
      ]);
      const { downloadCheckInOverviewExcel } = await import("@/lib/checkInOverviewExport");
      await downloadCheckInOverviewExcel({ preRegistered, checkedIn, walkIns });
    } catch (err) {
      console.error("[CheckInOverview] export failed", err);
      setExportError("Could not export. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const remaining = Math.max(0, counts.preRegisteredConfirmed - counts.checkedIn);
  const cardPadding = compact ? "sm" : "md";
  const countClass = compact ? "text-2xl" : "text-3xl";
  const helperClass = compact ? "mt-1 text-xs text-ink/55" : "mt-2 text-sm text-ink/55";
  const gridClass =
    compact && variant === "embed"
      ? "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3"
      : `${variant === "embed" ? "mt-4" : "mt-6"} grid grid-cols-1 gap-5 sm:grid-cols-3`;

  const heading = variant === "embed" ? (
    compact ? null : (
      <div>
        <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-ink">Check-in</h2>
        <p className="mt-2 max-w-[65ch] text-sm text-indigo">
          Live door counts. These update as people check in — no refresh needed.
        </p>
      </div>
    )
  ) : (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
        Check-in Overview
      </h1>
      <p className="mt-3 max-w-[65ch] text-sm text-indigo">
        Live door counts. These update as people check in — no refresh needed.
      </p>
    </div>
  );

  return (
    <div>
      {heading}

      <div className={gridClass}>
        <AdminCard accent="indigo" href={checkInOverviewListHref("preRegistered")} padding={cardPadding}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">
            Confirmed pre-registered
          </p>
          <p className={`mt-0.5 font-display font-extrabold text-ink ${countClass}`}>
            {counts.preRegisteredConfirmed}
          </p>
          {!compact && (
            <p className={helperClass}>The potential pool for today. Tap to view list.</p>
          )}
        </AdminCard>
        <AdminCard accent="forest" href={checkInOverviewListHref("checkedIn")} padding={cardPadding}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">Checked in so far</p>
          <p className={`mt-0.5 font-display font-extrabold text-ink ${countClass}`}>{counts.checkedIn}</p>
          {!compact && (
            <p className={helperClass}>
              {remaining} of the confirmed pool still to arrive. Tap to view list.
            </p>
          )}
        </AdminCard>
        <AdminCard accent="gold" href={checkInOverviewListHref("walkIns")} padding={cardPadding}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">Walk-in registrations</p>
          <p className={`mt-0.5 font-display font-extrabold text-ink ${countClass}`}>{counts.walkIns}</p>
          {!compact && <p className={helperClass}>On-site sign-ups. Tap to view list.</p>}
        </AdminCard>
      </div>

      {variant === "page" && (
        <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-surface px-6 py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            <Download className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
            {exporting ? "Exporting…" : "Export to Excel"}
          </button>
          <Link
            href="/admin/checkin"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
          >
            <ScanLine className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
            Open check-in scanner
          </Link>
          {exportError && <p className="text-sm text-madder">{exportError}</p>}
          <p className="w-full text-xs text-ink/50">
            One file with three sheets: confirmed pre-registered, checked in so far, and walk-in registrations.
          </p>
        </div>
      )}
    </div>
  );
}
