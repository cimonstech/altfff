"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/admin/actions";
import { ADMIN_SECTION_ICONS } from "@/components/admin/adminVisual";

export type AdminNavItem = {
  label: string;
  href: string;
  /** Table + starting status for the "needs attention" badge; omit for no badge. */
  attention?: { table: string; status: string };
};

function navItemIsActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Client sidebar: initial badge counts come from the server layout, then
 * stay live via a single Realtime channel on the four form tables.
 * INSERT (new submission) and UPDATE (status change) both trigger a
 * head-count refetch for that table — more reliable than incremental math
 * from event payloads under RLS.
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
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const allNavItems = useMemo(
    () => [...coreNavItems, ...superAdminNavItems],
    [coreNavItems, superAdminNavItems],
  );

  // Keep badges in sync if the server layout re-renders with new initials
  // (e.g. soft navigation that remounts the layout with fresh RSC data).
  useEffect(() => {
    setBadgesByHref(initialBadges);
  }, [initialBadges]);

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

    const tables = badgeTargets.map((t) => t.table);
    let channel = supabase.channel("admin-sidebar-badges");

    for (const table of tables) {
      channel = channel
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

    channel.subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error("[AdminSidebar] Realtime channel error:", status, err);
      }
    });

    return () => {
      for (const timer of Object.values(debounceRef.current)) clearTimeout(timer);
      debounceRef.current = {};
      void supabase.removeChannel(channel);
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
          "flex items-center justify-between gap-2 rounded-md py-2 pr-3 pl-2.5 text-sm font-medium transition-colors",
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
          <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-[11px] font-semibold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-hairline bg-surface px-5 py-8">
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

      <nav aria-label="Admin navigation" className="mt-8 flex flex-1 flex-col gap-1">
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
          className="mt-4 w-full rounded-md border border-hairline px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          Log out
        </button>
      </form>
    </aside>
  );
}
