"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { formatDate } from "@/lib/date";
import type { NewsPost } from "@/lib/newsPost";
import NewsCoverImage from "@/components/NewsCoverImage";

export default function NewsFeatured({ article, r2PublicUrl }: { article: NewsPost; r2PublicUrl: string }) {
  const container = useRef<HTMLElement>(null);
  const date = article.published_at ?? article.created_at;

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".featured-in", {
        y: 28,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: container.current, start: "top 78%", once: true },
      });
    },
    { scope: container },
  );

  return (
    <section ref={container} aria-label="Featured story" className="bg-paper px-6 py-20 md:px-16 md:py-28">
      <div className="featured-in mx-auto max-w-6xl overflow-hidden rounded-xl border border-hairline md:grid md:grid-cols-3">
        {article.cover_image_url ? (
          <div className="relative aspect-[4/3] overflow-hidden md:col-span-2 md:aspect-auto">
            <NewsCoverImage
              src={article.cover_image_url}
              alt={article.title}
              r2PublicUrl={r2PublicUrl}
              sizes="(min-width: 768px) 66vw, 100vw"
              priority
            />
          </div>
        ) : (
          <div className="hidden bg-surface md:col-span-2 md:block" aria-hidden="true" />
        )}
        <div className="flex flex-col justify-center bg-surface p-8 md:p-10">
          <p className="text-xs text-indigo">{formatDate(date)}</p>
          <h2 className="mt-3 font-display text-2xl font-extrabold uppercase leading-tight tracking-tight text-ink md:text-3xl">
            {article.title}
          </h2>
          {article.excerpt && <p className="mt-4 text-sm leading-relaxed text-ink">{article.excerpt}</p>}
          <Link
            href={`/blog/${article.slug}`}
            className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-gold-deep hover:opacity-75"
          >
            Read Story
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
