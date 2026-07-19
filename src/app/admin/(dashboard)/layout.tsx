import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/admin/actions";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin" },
  { label: "Exhibitor Applications", href: "/admin/exhibitors" },
  { label: "Sponsor Inquiries", href: "/admin/sponsors" },
  { label: "Visitor Registrations", href: "/admin/visitors" },
  { label: "Contact Messages", href: "/admin/contact" },
  { label: "News", href: "/admin/news" },
  { label: "Communications", href: "/admin/communications" },
];

const SUPER_ADMIN_NAV_ITEMS = [
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
  const navItems = isSuperAdmin ? [...NAV_ITEMS, ...SUPER_ADMIN_NAV_ITEMS] : NAV_ITEMS;

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-64 shrink-0 flex-col border-r border-hairline bg-surface px-5 py-8">
        <div>
          <p className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
            Alt.FFF Admin
          </p>
          <p className="mt-1 text-xs text-indigo">
            {profile?.full_name || user.email}
            {isSuperAdmin && " · Super Admin"}
          </p>
        </div>

        <nav aria-label="Admin navigation" className="mt-8 flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
            >
              {item.label}
            </Link>
          ))}
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

      <main className="flex-1 px-8 py-10">{children}</main>
    </div>
  );
}
