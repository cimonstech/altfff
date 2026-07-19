"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { formatDate } from "@/lib/date";
import type { NewsPost } from "@/lib/newsPost";
import NewsCoverImage from "@/components/NewsCoverImage";

function NewsCard({ article, r2PublicUrl }: { article: NewsPost; r2PublicUrl: string }) {
  const date = article.published_at ?? article.created_at;

  return (
    <Link href={`/news/${article.slug}`} className="news-card group block">
      {article.cover_image_url ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
          <NewsCoverImage
            src={article.cover_image_url}
            alt={article.title}
            r2PublicUrl={r2PublicUrl}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            objectClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] rounded-t-xl bg-surface" aria-hidden="true" />
      )}
      <div className="rounded-b-xl border border-t-0 border-hairline bg-surface p-5">
        <p className="text-xs text-indigo">{formatDate(date)}</p>
        <h3 className="mt-2 font-display text-base font-bold uppercase leading-snug tracking-tight text-ink">
          {article.title}
        </h3>
        {article.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/80">{article.excerpt}</p>}
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-deep">
          Read Story
          <span aria-hidden="true">&rarr;</span>
        </span>
      </div>
    </Link>
  );
}

export default function NewsGrid({ articles, r2PublicUrl }: { articles: NewsPost[]; r2PublicUrl: string }) {
  const container = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

  return (
    <section ref={container} aria-label="All news and press" className="bg-paper px-6 pb-20 md:px-16 md:pb-28">
      <div className="mx-auto max-w-6xl">
        {articles.length === 0 ? (
          <p className="text-sm text-indigo">No news yet, check back soon.</p>
        ) : (
          <div ref={gridRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <NewsCard key={article.slug} article={article} r2PublicUrl={r2PublicUrl} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
