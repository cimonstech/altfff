import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar, { type AdminNavItem } from "@/components/admin/AdminSidebar";
import AdminLayoutExtras from "@/components/admin/AdminLayoutExtras";

const NAV_ITEMS: AdminNavItem[] = [
  { label: "Overview", href: "/admin" },
  {
    label: "Exhibitor Applications",
    href: "/admin/exhibitors",
    attention: { table: "exhibitor_applications", status: "new" },
  },
  {
    label: "Sponsor Inquiries",
    href: "/admin/sponsors",
    attention: { table: "sponsor_inquiries", status: "new_inquiry" },
  },
  {
    label: "Visitor Registrations",
    href: "/admin/visitors",
    attention: { table: "visitor_registrations", status: "registered" },
  },
  {
    label: "Contact Messages",
    href: "/admin/contact",
    attention: { table: "contact_messages", status: "new" },
  },
  { label: "News", href: "/admin/news" },
  { label: "Communications", href: "/admin/communications" },
  { label: "Check-in", href: "/admin/checkin" },
];

const SUPER_ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Activity Log", href: "/admin/activity" },
  { label: "Admins", href: "/admin/admins" },
];

/**
 * Protected dashboard shell for every real admin page. Lives in the
 * (dashboard) route group specifically so it does NOT wrap
 * /admin/login or /admin/set-password (both are siblings of this route
 * group, not children of it) - a layout at app/admin/layout.tsx would
 * otherwise redirect the login page to itself before anyone could ever
 * sign in.
 *
 * The middleware already redirects unauthenticated requests away from
 * /admin/* at the edge; this check is a second, independent layer at the
 * Server Component level in case that edge config is ever wrong.
 *
 * Badge counts are fetched once here for the initial paint, then kept live
 * by AdminSidebar's Realtime subscription (client).
 */
export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = profile?.role === "super_admin";
  const coreNavItems = NAV_ITEMS;
  const superAdminNavItems = isSuperAdmin ? SUPER_ADMIN_NAV_ITEMS : [];
  const navItems = [...coreNavItems, ...superAdminNavItems];

  const badgeTargets = navItems.filter((item) => item.attention);
  const badgeCounts = await Promise.all(
    badgeTargets.map(async (item) => {
      const { count } = await supabase
        .from(item.attention!.table)
        .select("*", { count: "exact", head: true })
        .eq("status", item.attention!.status);
      return count ?? 0;
    }),
  );
  const badgesByHref: Record<string, number> = {};
  badgeTargets.forEach((item, i) => {
    badgesByHref[item.href] = badgeCounts[i];
  });

  const userLabel = `${profile?.full_name || user.email}${isSuperAdmin ? " · Super Admin" : ""}`;

  return (
    <div className="flex min-h-screen flex-col bg-paper md:flex-row">
      <AdminSidebar
        coreNavItems={coreNavItems}
        superAdminNavItems={superAdminNavItems}
        initialBadges={badgesByHref}
        userLabel={userLabel}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminLayoutExtras />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
