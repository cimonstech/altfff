import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { buildMetadata } from "@/lib/metadata";
import pressCoverage from "@/app/data/in-the-news.json";

export const metadata: Metadata = buildMetadata({
  title: "In the news | Alt.FFF",
  description: "Coverage of Alt.FFF in the press, on TV and online.",
  path: "/media/in-the-news",
});

type PressPick = {
  outlet: string;
  title: string;
  date?: string | null;
  medium: string;
  url: string;
};

function formatPressDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InTheNewsPage() {
  const picks = pressCoverage.picks as PressPick[];

  return (
    <>
      <Nav />
      <main className="bg-paper px-6 pb-20 pt-32 md:px-16 md:pb-28 md:pt-40">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-[clamp(2.2rem,6vw,4rem)] font-extrabold uppercase leading-[1.02] tracking-tight text-ink">
            In the news
          </h1>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-ink/80 md:text-lg">
            Coverage of Alt.FFF in the press, on TV and online.
          </p>
          <ul className="mt-12 grid list-none grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {picks.map((item) => {
              const date = formatPressDate(item.date);
              return (
                <li key={item.url} className="min-w-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-card group flex h-full flex-col rounded-xl border border-hairline bg-surface p-5 transition-colors hover:border-gold"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">{item.outlet}</p>
                      <span className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/70">
                        {item.medium}
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-base font-bold uppercase leading-snug tracking-tight text-ink">
                      {item.title}
                    </h2>
                    {date ? <p className="mt-auto pt-4 text-xs text-indigo">{date}</p> : null}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
