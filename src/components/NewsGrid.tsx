"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { formatDate } from "@/lib/date";
import type { NewsArticle, NewsCategory } from "@/data/news";

const CATEGORIES: readonly ("All" | NewsCategory)[] = [
  "All",
  "Announcement",
  "Press",
  "Materials",
  "Partners",
  "Event",
];

function NewsCard({ article }: { article: NewsArticle }) {
  const isExternal = Boolean(article.externalUrl);
  const href = isExternal ? article.externalUrl! : `/news/${article.slug}`;

  const content = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
      <div className="rounded-b-xl border border-t-0 border-hairline bg-surface p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
            {article.category}
          </span>
          {isExternal && <ExternalLink size={12} className="text-indigo" aria-hidden="true" />}
        </div>
        <p className="mt-2 text-xs text-indigo">{formatDate(article.date)}</p>
        <h3 className="mt-2 font-display text-base font-bold uppercase leading-snug tracking-tight text-ink">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/80">{article.excerpt}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-deep">
          Read {isExternal ? "Article" : "Story"}
          <span aria-hidden="true">&rarr;</span>
        </span>
      </div>
    </>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="news-card group block">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className="news-card group block">
      {content}
    </Link>
  );
}

export default function NewsGrid({ articles }: { articles: NewsArticle[] }) {
  const container = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<"All" | NewsCategory>("All");

  const filtered = active === "All" ? articles : articles.filter((a) => a.category === active);

  // Initial reveal, once, on first scroll into view — independent of the
  // filter-change fade below.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".news-card", {
        y: 28,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.06,
        scrollTrigger: { trigger: container.current, start: "top 75%", once: true },
      });
    },
    { scope: container },
  );

  // Filter changes: a fast fade swap rather than a full FLIP reorder — the
  // grid's contents change (different articles, not just repositioned
  // ones), so a from-scratch FLIP enter/leave setup would be solving a
  // harder problem than this needs.
  const handleFilter = (cat: "All" | NewsCategory) => {
    if (cat === active) return;
    if (prefersReducedMotion() || !gridRef.current) {
      setActive(cat);
      return;
    }
    gsap.to(gridRef.current, {
      autoAlpha: 0,
      y: 8,
      duration: 0.18,
      ease: "power2.in",
      onComplete: () => setActive(cat),
    });
  };

  useEffect(() => {
    if (prefersReducedMotion() || !gridRef.current) return;
    gsap.fromTo(gridRef.current, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" });
  }, [active]);

  return (
    <section ref={container} aria-label="All news and press" className="bg-paper px-6 pb-20 md:px-16 md:pb-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleFilter(cat)}
              aria-pressed={active === cat}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                active === cat
                  ? "bg-ink text-gold"
                  : "border border-hairline text-ink hover:border-gold"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="mt-16 text-sm text-indigo">
            No stories in this category yet. Check back soon.
          </p>
        ) : (
          <div ref={gridRef} className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((article) => (
              <NewsCard key={article.slug} article={article} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
