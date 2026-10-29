"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ellipsis, Handshake, LayoutGrid, Search, Store } from "lucide-react";
import { BrandName } from "@/components/BrandName";
import GuideLogo from "@/components/GuideLogo";
import {
  entryMatchesBrowse,
  entryMatchesQuery,
  guideVisual,
  GUIDE_TYPE_LABEL,
  GUIDE_TYPE_PLURAL,
  GUIDE_TYPES,
  GUIDE_ZONE_LABEL,
  GUIDE_ZONES,
  isGuideType,
  tradeShowEntries,
  type GuideBrowse,
  type GuideEntry,
  type GuideType,
} from "@/data/tradeShowGuide";

const HERO_TEXTILE = "/event/2026/materials/AltFashionFair-88.jpg";

const TYPE_PILLS: { id: GuideBrowse; label: string }[] = [
  { id: "all", label: "All" },
  ...GUIDE_TYPES.map((type) => ({ id: type, label: GUIDE_TYPE_PLURAL[type] })),
];

const MORE_TYPES: GuideType[] = ["sponsor", "supporter", "supporting-brand", "media-partner", "advert"];

/** Sit in the category list where Experience Hall and Food Court were. */
const PLACED_TYPES: GuideType[] = ["supporting-brand", "media-partner", "advert"];

const DOCK: { id: GuideBrowse | "more"; label: string; icon: typeof LayoutGrid }[] = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "exhibitor", label: "Exhibitors", icon: Store },
  { id: "partner", label: "Partners", icon: Handshake },
  { id: "more", label: "More", icon: Ellipsis },
];

const SIDEBAR: { id: GuideBrowse; label: string }[] = [
  { id: "all", label: "All" },
  ...GUIDE_ZONES.map((zone) => ({ id: zone, label: GUIDE_ZONE_LABEL[zone] })),
  ...PLACED_TYPES.map((type) => ({ id: type, label: GUIDE_TYPE_PLURAL[type] })),
  ...GUIDE_TYPES.filter((type) => type !== "exhibitor" && !PLACED_TYPES.includes(type)).map((type) => ({
    id: type,
    label: GUIDE_TYPE_PLURAL[type],
  })),
];

const CATEGORY_CHIPS: { id: GuideBrowse; label: string }[] = SIDEBAR.filter((item) => item.id !== "all");

function badgeFor(entry: GuideEntry): string {
  const type = GUIDE_TYPE_LABEL[entry.type];
  if (!entry.zone) return type;
  return `${type} · ${GUIDE_ZONE_LABEL[entry.zone]}`;
}

function GuideCard({ entry }: { entry: GuideEntry }) {
  const website = entry.links?.find((link) => link.label === "Visit Website");
  const visual = guideVisual(entry);
  const photo = visual.cover;
  const logoOnWhite = entry.type !== "exhibitor";
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_1px_0_rgba(1,83,71,0.04)]">
      <Link href={`/trade-show-guide/${entry.id}`} className="flex gap-3 p-3 md:flex-col md:p-0">
        <div
          className={`flex shrink-0 overflow-hidden ${logoOnWhite ? "bg-white" : "bg-[#f3efe6]"} ${
            photo
              ? "h-16 w-16 rounded-xl md:h-52 md:w-full md:rounded-none"
              : "h-16 w-16 items-center justify-center rounded-xl md:h-44 md:w-full md:rounded-none"
          }`}
        >
          <GuideLogo src={visual.src} name={entry.name} cover={photo} />
        </div>
        <div className="min-w-0 flex-1 py-0.5 md:px-4 md:pb-4 md:pt-3">
          <h3 className="font-display text-base font-extrabold leading-tight tracking-tight text-ink md:text-lg">
            {entry.name}
          </h3>
          <p className="mt-2 inline-flex rounded-full bg-[#f3efe6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/70">
            {badgeFor(entry)}
          </p>
          {entry.location ? <p className="mt-2 text-sm text-ink/70">{entry.location}</p> : null}
          {entry.shortDescription ? (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/75">{entry.shortDescription}</p>
          ) : null}
        </div>
      </Link>
      {website || entry.emails?.length || entry.phone ? (
        <div className="flex flex-col gap-1 px-3 pb-3 md:px-4 md:pb-4">
          {entry.emails?.map((email) => (
            <a key={email} href={`mailto:${email}`} className="inline-flex min-h-11 items-center text-sm text-ink/75 hover:text-gold-deep">
              {email}
            </a>
          ))}
          {entry.phone ? (
            <a href={`tel:${entry.phone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center text-sm text-ink/75 hover:text-gold-deep">
              {entry.phone}
            </a>
          ) : null}
          {website ? (
            <a
              href={website.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-ink hover:text-gold-deep"
            >
              Visit Website →
            </a>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function TradeShowGuide() {
  const [browse, setBrowse] = useState<GuideBrowse>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"az" | "za">("az");
  const [moreOpen, setMoreOpen] = useState(false);

  const queried = useMemo(
    () => tradeShowEntries.filter((entry) => entryMatchesQuery(entry, query)),
    [query],
  );

  const visible = useMemo(() => {
    const matched = queried.filter((entry) => entryMatchesBrowse(entry, browse));
    return [...matched].sort((a, b) => {
      const order = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      return sort === "az" ? order : -order;
    });
  }, [queried, browse, sort]);

  const counts = useMemo(() => {
    const tally = new Map<GuideBrowse, number>();
    tally.set("all", 0);
    for (const zone of GUIDE_ZONES) tally.set(zone, 0);
    for (const type of GUIDE_TYPES) tally.set(type, 0);
    for (const entry of queried) {
      tally.set(entry.type, (tally.get(entry.type) ?? 0) + 1);
      if (entry.type === "exhibitor") {
        tally.set("all", (tally.get("all") ?? 0) + 1);
        if (entry.zone) tally.set(entry.zone, (tally.get(entry.zone) ?? 0) + 1);
      }
    }
    return tally;
  }, [queried]);

  const searching = query.trim().length > 0;
  const categoryEmpty = tradeShowEntries.filter((entry) => entryMatchesBrowse(entry, browse)).length === 0;
  const countLabel = `${visible.length} ${visible.length === 1 ? "organisation" : "organisations"}`;

  const choose = (next: GuideBrowse) => {
    setBrowse(next);
    setMoreOpen(false);
  };

  const pillPressed = (id: GuideBrowse) => {
    if (id === "exhibitor" && browse !== "all" && !isGuideType(browse)) return true;
    return browse === id;
  };

  return (
    <div data-trade-guide="">
      <section className="relative overflow-hidden bg-paper px-5 pb-2 pt-28 md:px-10 md:pt-36">
        <img
          src={HERO_TEXTILE}
          alt=""
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[42%] object-cover lg:block"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-gradient-to-r from-paper via-paper/20 to-transparent lg:block" />
        <div className="relative mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink/55">
            <BrandName /> 2026
          </p>
          <h1 className="mt-3 max-w-[12ch] font-display text-[clamp(2.6rem,6vw,4.6rem)] font-extrabold leading-[0.95] tracking-tight text-ink">
            Trade Show Guide
          </h1>
          <p className="mt-4 max-w-[36ch] text-base leading-snug text-ink/80">
            The businesses, makers and organisations that joined us at <BrandName /> 2026.
          </p>
          <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-ink/60">
            A searchable directory of exhibitors, sponsors, partners, supporters, supporting brands, media partners and adverts from the 2026 edition.
          </p>
        </div>
      </section>

      <section className="bg-paper px-5 pb-28 pt-6 md:px-10 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <label className="relative block">
            <span className="sr-only">Search the directory</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
              aria-hidden="true"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, category or keyword"
              autoComplete="off"
              className="min-h-12 w-full rounded-xl border border-ink/10 bg-white py-3 pl-11 pr-4 text-base text-ink outline-none placeholder:text-ink/35 focus-visible:border-gold"
            />
          </label>

          <div className="mt-4 hidden flex-wrap gap-2 md:flex" role="group" aria-label="Directory">
            {TYPE_PILLS.map((item) => {
              const active = pillPressed(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(item.id)}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium ${
                    active ? "bg-ink text-paper" : "border border-ink/10 bg-white text-ink hover:border-ink/25"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" role="group" aria-label="Browse by category">
            {CATEGORY_CHIPS.map((item) => {
              const active = browse === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(item.id)}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm ${
                    active ? "bg-[#f3e4d8] font-semibold text-ink" : "border border-ink/10 bg-white text-ink"
                  }`}
                >
                  {item.label}
                  <span className="ml-2 text-ink/45">{counts.get(item.id) ?? 0}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
            <aside className="hidden lg:block">
              <p className="text-sm font-semibold text-ink">Browse by category</p>
              <ul className="mt-3 flex flex-col gap-1">
                {SIDEBAR.map((item) => {
                  const active = browse === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => choose(item.id)}
                        className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm ${
                          active ? "bg-[#f3e4d8] font-semibold text-ink" : "text-ink/75 hover:bg-white"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className="text-ink/45">{counts.get(item.id) ?? 0}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm text-ink/70" aria-live="polite">
                  {searching ? `${countLabel} matching your search` : countLabel}
                </p>
                <label className="flex items-center gap-2 text-sm text-ink/70">
                  <span className="sr-only">Sort</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as "az" | "za")}
                    className="min-h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm text-ink"
                  >
                    <option value="az">Sort by A–Z</option>
                    <option value="za">Sort by Z–A</option>
                  </select>
                </label>
              </div>

              {visible.length === 0 ? (
                <p className="rounded-2xl border border-ink/10 bg-white px-4 py-10 text-center text-sm text-ink/70">
                  {categoryEmpty ? "No listings in this category yet." : "No organisations match that search."}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {visible.map((entry) => (
                    <GuideCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {moreOpen && (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm rounded-2xl border border-ink/10 bg-white p-2 shadow-[0_16px_40px_rgba(1,83,71,0.18)] md:hidden">
          {MORE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => choose(type)}
              className={`flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-sm font-medium ${
                browse === type ? "bg-[#f3e4d8] text-ink" : "text-ink"
              }`}
            >
              {GUIDE_TYPE_PLURAL[type]}
              <span className="text-ink/45">{counts.get(type) ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      <nav
        aria-label="Directory"
        className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 gap-1 rounded-full border border-white/15 bg-ink/95 p-1.5 shadow-[0_12px_32px_rgba(1,83,71,0.35)] backdrop-blur-md md:hidden"
      >
        {DOCK.map((item) => {
          const active =
            item.id === "more"
              ? moreOpen || MORE_TYPES.includes(browse as GuideType)
              : item.id === "exhibitor"
                ? browse === "exhibitor" || (browse !== "all" && !isGuideType(browse))
                : browse === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (item.id === "more") setMoreOpen((open) => !open);
                else choose(item.id);
              }}
              className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${
                active ? "bg-gold text-ink" : "text-paper/80"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
