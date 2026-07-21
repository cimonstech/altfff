import { createClient } from "@/lib/supabase/server";
import AdminCard, { type AdminCardAccent } from "@/components/admin/AdminCard";
import {
  ADMIN_SECTION_ICONS,
  OVERVIEW_ACCENTS,
  adminStatusPillClass,
  formatAdminStatusLabel,
} from "@/components/admin/adminVisual";

type Entity = {
  label: string;
  table: string;
  statuses: string[];
  href: string;
  accent: AdminCardAccent;
};

const ENTITIES: Entity[] = [
  {
    label: "Exhibitor Applications",
    table: "exhibitor_applications",
    statuses: ["new", "under_review", "invoiced", "payment_received", "confirmed", "cancelled"],
    href: "/admin/exhibitors",
    accent: OVERVIEW_ACCENTS.exhibitor_applications,
  },
  {
    label: "Sponsor Inquiries",
    table: "sponsor_inquiries",
    statuses: ["new_inquiry", "contacted", "proposal_sent", "confirmed", "declined"],
    href: "/admin/sponsors",
    accent: OVERVIEW_ACCENTS.sponsor_inquiries,
  },
  {
    label: "Visitor Registrations",
    table: "visitor_registrations",
    statuses: ["registered", "confirmed", "cancelled"],
    href: "/admin/visitors",
    accent: OVERVIEW_ACCENTS.visitor_registrations,
  },
  {
    label: "Contact Messages",
    table: "contact_messages",
    statuses: ["new", "read", "responded", "archived"],
    href: "/admin/contact",
    accent: OVERVIEW_ACCENTS.contact_messages,
  },
];

async function getCounts(entity: Entity) {
  const supabase = await createClient();
  const perStatus = await Promise.all(
    entity.statuses.map(async (status) => {
      const { count } = await supabase
        .from(entity.table)
        .select("*", { count: "exact", head: true })
        .eq("status", status);
      return { status, count: count ?? 0 };
    }),
  );
  const total = perStatus.reduce((sum, s) => sum + s.count, 0);
  return { total, perStatus };
}

export default async function AdminOverviewPage() {
  const results = await Promise.all(ENTITIES.map((e) => getCounts(e)));

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">Overview</h1>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {ENTITIES.map((entity, i) => {
          const { total, perStatus } = results[i];
          // Only show statuses with at least one row, so a mostly-empty
          // table doesn't print a wall of "0" lines.
          const nonZero = perStatus.filter((s) => s.count > 0);
          const Icon = ADMIN_SECTION_ICONS[entity.href];

          return (
            <AdminCard key={entity.table} href={entity.href} accent={entity.accent}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{entity.label}</p>
                  <p className="mt-1 font-display text-3xl font-extrabold text-ink">{total}</p>
                </div>
                {Icon && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-paper text-ink/55">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={1.75} />
                  </span>
                )}
              </div>

              {nonZero.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {nonZero.map((s) => (
                    <li key={s.status}>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${adminStatusPillClass(s.status)}`}
                      >
                        {s.count} {formatAdminStatusLabel(s.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-ink/50">No records yet.</p>
              )}
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}
