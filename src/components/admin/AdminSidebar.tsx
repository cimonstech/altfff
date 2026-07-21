"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { AuthChangeEvent, RealtimeChannel, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/admin/actions";
import { ADMIN_SECTION_ICONS } from "@/components/admin/adminVisual";

export type AdminNavItem = {
  label: string;
  href: string;
  /** Table + starting status for the "needs attention" badge; omit for no badge. */
  attention?: { table: string; status: string };
};

const BADGE_CHANNEL_NAME = "admin-sidebar-badges";
/** Backoff for Realtime reconnect after channel errors or offline blips. */
const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 30000;

function navItemIsActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Client sidebar: desktop persistent rail; below md a top-bar + overlay drawer.
 * Badge counts stay live via Realtime; auth token sync + reconnect on expiry/errors.
 */
export default function AdminSidebar({
  coreNavItems,
  superAdminNavItems,
  initialBadges,
  userLabel,
}: {
  coreNavItems: AdminNavItem[];
  superAdminNavItems: AdminNavItem[];
  initialBadges: Record<string, number>;
  userLabel: string;
}) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [badgesByHref, setBadgesByHref] = useState(initialBadges);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const allNavItems = useMemo(
    () => [...coreNavItems, ...superAdminNavItems],
    [coreNavItems, superAdminNavItems],
  );

  useEffect(() => {
    setBadgesByHref(initialBadges);
  }, [initialBadges]);

  // Close drawer on route change (nav link tap).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  const badgeTargets = useMemo(
    () =>
      allNavItems
        .filter((item): item is AdminNavItem & { attention: { table: string; status: string } } => !!item.attention)
        .map((item) => ({
          href: item.href,
          table: item.attention.table,
          status: item.attention.status,
        })),
    [allNavItems],
  );

  const refetchTableCount = useCallback(
    async (table: string) => {
      const target = badgeTargets.find((t) => t.table === table);
      if (!target) return;
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("status", target.status);
      if (error) {
        console.error(`[AdminSidebar] badge count failed for ${table}:`, error);
        return;
      }
      setBadgesByHref((prev) => ({ ...prev, [target.href]: count ?? 0 }));
    },
    [badgeTargets, supabase],
  );

  const scheduleRefetch = useCallback(
    (table: string) => {
      const existing = debounceRef.current[table];
      if (existing) clearTimeout(existing);
      debounceRef.current[table] = setTimeout(() => {
        void refetchTableCount(table);
      }, 150);
    },
    [refetchTableCount],
  );

  useEffect(() => {
    if (badgeTargets.length === 0) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let subscribed = false;
    let connecting = false;
    let intentionalTeardown = false;

    const tables = badgeTargets.map((t) => t.table);

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

    const subscribeChannel = async () => {
      if (cancelled || connecting) return;
      connecting = true;
      clearReconnectTimer();

      try {
        await teardownChannel();
        await syncRealtimeAuth();
        if (cancelled) return;

        let nextChannel = supabase.channel(BADGE_CHANNEL_NAME);
        for (const table of tables) {
          nextChannel = nextChannel
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table },
              () => scheduleRefetch(table),
            )
            .on(
              "postgres_changes",
              { event: "UPDATE", schema: "public", table },
              () => scheduleRefetch(table),
            );
        }

        channel = nextChannel;
        nextChannel.subscribe((status, err) => {
          if (cancelled) return;

          if (status === "SUBSCRIBED") {
            subscribed = true;
            reconnectAttempt = 0;
            return;
          }

          subscribed = false;

          if (intentionalTeardown) return;

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            console.error("[AdminSidebar] Realtime channel error:", status, err);
            scheduleReconnect();
          }
        });
      } finally {
        connecting = false;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer || connecting) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void subscribeChannel();
      }, delay);
    };

    const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      if (cancelled) return;

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await supabase.realtime.setAuth(session?.access_token ?? null);
        // setAuth updates joined channels, but an errored subscription stays
        // dead until we tear down and subscribe again with the fresh token.
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

    const onOnline = () => recoverConnection();

    const onVisibility = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      void (async () => {
        // Idle tabs may miss TOKEN_REFRESHED while throttled; re-read session
        // when the admin returns and reconnect if the channel isn't healthy.
        await supabase.auth.getSession();
        await syncRealtimeAuth();
        if (!subscribed) scheduleReconnect();
      })();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    void subscribeChannel();

    return () => {
      cancelled = true;
      authSubscription.unsubscribe();
      clearReconnectTimer();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      void teardownChannel();
      for (const timer of Object.values(debounceRef.current)) clearTimeout(timer);
      debounceRef.current = {};
    };
  }, [supabase, badgeTargets, scheduleRefetch]);

  const renderNavLink = (item: AdminNavItem) => {
    const count = badgesByHref[item.href] ?? 0;
    const active = navItemIsActive(item.href, pathname);
    const Icon = ADMIN_SECTION_ICONS[item.href];

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={[
          "flex min-h-11 items-center justify-between gap-2 rounded-md py-2.5 pr-3 pl-2.5 text-sm font-medium transition-colors",
          active
            ? "border-l-[3px] border-l-gold bg-paper text-ink"
            : "border-l-[3px] border-l-transparent text-ink hover:bg-paper",
        ].join(" ")}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <Icon
              className={`h-4 w-4 shrink-0 ${active ? "text-gold-deep" : "text-ink/45"}`}
              aria-hidden="true"
              strokeWidth={1.75}
            />
          )}
          <span className="min-w-0 leading-snug">{item.label}</span>
        </span>
        {count > 0 && (
          <span className="shrink-0 rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    );
  };

  const panel = (
    <>
      <div className="flex items-start gap-3">
        <Image
          src="/Afff_icon.png"
          alt=""
          width={36}
          height={36}
          className="mt-0.5 h-9 w-9 shrink-0 object-contain"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
            Alt.FFF Admin
          </p>
          <p className="mt-1 text-xs text-indigo">{userLabel}</p>
        </div>
      </div>

      <nav aria-label="Admin navigation" className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
        {coreNavItems.map(renderNavLink)}

        {superAdminNavItems.length > 0 && (
          <>
            <div className="my-3 border-t border-hairline" role="separator" />
            <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
              Super admin
            </p>
            {superAdminNavItems.map(renderNavLink)}
          </>
        )}
      </nav>

      <form action={logout}>
        <button
          type="submit"
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-md border border-hairline px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          Log out
        </button>
      </form>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-hairline bg-surface px-4 md:hidden">
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          aria-controls="admin-nav-drawer"
          onClick={() => setDrawerOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink hover:bg-paper"
        >
          <Menu className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-extrabold uppercase tracking-tight text-ink">
            Alt.FFF Admin
          </p>
        </div>
        <Image
          src="/Afff_icon.png"
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 object-contain"
          aria-hidden="true"
        />
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        id="admin-nav-drawer"
        className={[
          "flex flex-col border-hairline bg-surface",
          // Desktop: persistent rail
          "md:relative md:flex md:h-auto md:w-64 md:shrink-0 md:translate-x-0 md:border-r md:px-5 md:py-8",
          // Mobile: fixed drawer
          "fixed inset-y-0 left-0 z-50 w-[min(20rem,88vw)] max-w-full border-r px-5 py-6 shadow-[8px_0_24px_rgba(23,28,38,0.12)] transition-transform duration-200 ease-out md:shadow-none",
          drawerOpen ? "translate-x-0" : "-translate-x-full pointer-events-none max-md:invisible md:pointer-events-auto md:visible md:translate-x-0",
        ].join(" ")}
      >
        <div className="mb-4 flex items-center justify-end md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink/60 hover:bg-paper hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />
          </button>
        </div>
        {panel}
      </aside>
    </>
  );
}
