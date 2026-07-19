import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import NewsHero from "@/components/NewsHero";
import NewsFeatured from "@/components/NewsFeatured";
import NewsGrid from "@/components/NewsGrid";
import NewsletterBand from "@/components/NewsletterBand";
import { createClient } from "@/lib/supabase/server";
import { buildMetadata } from "@/lib/metadata";
import type { NewsPost } from "@/lib/newsPost";

export const metadata: Metadata = buildMetadata({
  title: "News & Press | Alt.FFF 2026",
  description:
    "Announcements, stories, and press coverage from Alt.FFF, Ghana's first alternative fashion fabric fair.",
  path: "/news",
});

// Editor-driven content, not static build-time data - ISR so a newly
// published or edited post shows up within a minute, no redeploy needed.
export const revalidate = 60;

export default async function NewsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at, created_at")
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Failed to load news posts:", error);
  }
  const posts = (data ?? []) as NewsPost[];
  const [featured, ...rest] = posts;
  const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";

  return (
    <>
      <Nav />
      <main>
        <NewsHero latestTitles={posts.slice(0, 3).map((a) => a.title)} />
        {featured && <NewsFeatured article={featured} r2PublicUrl={r2PublicUrl} />}
        <NewsGrid articles={rest} r2PublicUrl={r2PublicUrl} />

        {/* Press kit band */}
        <section aria-label="Press enquiries" className="bg-madder px-6 py-16 text-paper md:px-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
                Writing about Alt.FFF?
              </h2>
              <p className="mt-2 max-w-[55ch] text-sm leading-relaxed text-paper/85 md:text-base">
                Get in touch for the press kit, imagery, and interviews with
                the Alt.FFF team.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-4">
              <a
                href="mailto:enquiries@altfff.com?subject=Alt.FFF%20Press%20Enquiry"
                className="inline-flex items-center gap-2 rounded-full border border-gold bg-gold px-7 py-3.5 text-sm font-semibold text-paper transition-colors hover:border-gold-deep hover:bg-gold-deep"
              >
                Contact Press
              </a>
              {/* Uncomment once the client supplies a real press kit file
                  at public/press-kit.zip:
              <a
                href="/press-kit.zip"
                className="inline-flex items-center gap-2 rounded-full border border-paper px-7 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-paper hover:text-madder"
              >
                Download Press Kit
              </a>
              */}
            </div>
          </div>
        </section>

        <section aria-label="Newsletter" className="bg-paper px-6 py-20 md:px-16 md:py-28">
          <div className="mx-auto max-w-6xl">
            <NewsletterBand fieldId="news-newsletter-email" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
