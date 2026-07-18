import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ShareRow from "@/components/ShareRow";
import { getAllArticles, getArticleBySlug } from "@/data/news";
import { formatDate } from "@/lib/date";
import { buildMetadata } from "@/lib/metadata";

export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  return buildMetadata({
    title: `${article.title} | Alt.FFF News`,
    description: article.excerpt,
    path: `/news/${slug}`,
    image: article.image,
  });
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

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
              {article.category} &middot; {formatDate(article.date)}
            </p>
            <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase leading-tight tracking-tight text-ink">
              {article.title}
            </h1>
          </div>

          <div className="relative mx-auto mt-10 aspect-[16/9] max-w-4xl overflow-hidden rounded-xl border border-hairline">
            <Image
              src={article.image}
              alt={article.title}
              fill
              sizes="(min-width: 1024px) 900px, 100vw"
              className="object-cover"
              priority
            />
          </div>

          <div className="mx-auto mt-10 max-w-[65ch]">
            {article.body.map((paragraph, i) => (
              <p key={i} className="mt-5 text-base leading-relaxed text-ink first:mt-0">
                {paragraph}
              </p>
            ))}

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

