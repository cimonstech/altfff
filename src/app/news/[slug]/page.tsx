import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ShareRow from "@/components/ShareRow";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/date";
import { buildMetadata } from "@/lib/metadata";
import type { NewsPost } from "@/lib/newsPost";
import NewsCoverImage from "@/components/NewsCoverImage";

// Editor-driven content now, not build-time static data - ISR instead of
// generateStaticParams, so newly published articles (unknown at build
// time) still render on first request and stay fresh thereafter.
export const revalidate = 60;

async function getPublishedPostBySlug(slug: string): Promise<NewsPost | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_posts")
    .select("id, slug, title, excerpt, cover_image_url, content_html, published_at, created_at")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (error || !data) return null;
  return data as NewsPost;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedPostBySlug(slug);
  if (!article) return {};

  return buildMetadata({
    title: `${article.title} | Alt.FFF News`,
    description: article.excerpt ?? article.title,
    path: `/news/${slug}`,
    ...(article.cover_image_url ? { image: article.cover_image_url } : {}),
  });
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedPostBySlug(slug);
  if (!article) notFound();

  const date = article.published_at ?? article.created_at;
  const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";

  return (
    <>
      <Nav />
      <main>
        <article className="bg-paper px-6 pb-20 pt-32 md:px-16 md:pt-40">
          <div className="mx-auto max-w-[65ch]">
            <Link href="/news" className="text-sm font-semibold text-gold-deep hover:opacity-75">
              &larr; Back to News
            </Link>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep">
              {formatDate(date)}
            </p>
            <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase leading-tight tracking-tight text-ink">
              {article.title}
            </h1>
          </div>

          {article.cover_image_url && (
            <div className="relative mx-auto mt-10 aspect-[16/9] max-w-4xl overflow-hidden rounded-xl border border-hairline">
              <NewsCoverImage
                src={article.cover_image_url}
                alt={article.title}
                r2PublicUrl={r2PublicUrl}
                sizes="(min-width: 1024px) 900px, 100vw"
                priority
              />
            </div>
          )}

          <div className="mx-auto mt-10 max-w-[65ch]">
            {/* content_html is pre-generated server-side (via @tiptap/html's
                generateHTML) from a controlled editor, not raw user input -
                safe to render directly. */}
            {article.content_html && (
              <div className="rich-text" dangerouslySetInnerHTML={{ __html: article.content_html }} />
            )}

            <ShareRow slug={article.slug} />

            <Link
              href="/news"
              className="mt-10 inline-block text-sm font-semibold text-gold-deep hover:opacity-75"
            >
              &larr; Back to News
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
