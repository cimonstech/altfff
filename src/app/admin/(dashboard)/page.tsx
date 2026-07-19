import { createClient } from "@/lib/supabase/server";

type Entity = {
  label: string;
  table: string;
  statuses: string[];
  href: string;
};

const ENTITIES: Entity[] = [
  {
    label: "Exhibitor Applications",
    table: "exhibitor_applications",
    statuses: ["new", "under_review", "invoiced", "payment_received", "confirmed", "cancelled"],
    href: "/admin/exhibitors",
  },
  {
    label: "Sponsor Inquiries",
    table: "sponsor_inquiries",
    statuses: ["new_inquiry", "contacted", "proposal_sent", "confirmed", "declined"],
    href: "/admin/sponsors",
  },
  {
    label: "Visitor Registrations",
    table: "visitor_registrations",
    statuses: ["registered", "confirmed", "cancelled"],
    href: "/admin/visitors",
  },
  {
    label: "Contact Messages",
    table: "contact_messages",
    statuses: ["new", "read", "responded", "archived"],
    href: "/admin/contact",
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

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {ENTITIES.map((entity, i) => {
          const { total, perStatus } = results[i];
          // Only show statuses with at least one row, so a mostly-empty
          // table doesn't print a wall of "0" lines.
          const nonZero = perStatus.filter((s) => s.count > 0);
          return (
            <a
              key={entity.table}
              href={entity.href}
              className="block rounded-md border border-hairline bg-surface p-5 transition-colors hover:bg-paper"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{entity.label}</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-ink">{total}</p>
              {nonZero.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-1 text-sm text-ink/70">
                  {nonZero.map((s) => (
                    <li key={s.status}>
                      {s.count} {s.status.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink/50">No records yet.</p>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
