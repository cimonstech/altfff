import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import NewsHero from "@/components/NewsHero";
import NewsFeatured from "@/components/NewsFeatured";
import NewsGrid from "@/components/NewsGrid";
import NewsletterBand from "@/components/NewsletterBand";
import { getAllArticles, getFeaturedArticle, getLatestArticles } from "@/data/news";
import { SITE } from "@/lib/constants";

const TITLE = "News & Press | Alt.FFF 2026";
const DESCRIPTION =
  "Announcements, stories, and press coverage from Alt.FFF, Ghana's first alternative fashion fabric fair.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [SITE.ogImage],
  },
};

export default async function NewsPage() {
  const [allArticles, featured, latest] = await Promise.all([
    getAllArticles(),
    getFeaturedArticle(),
    getLatestArticles(3),
  ]);

  const gridArticles = featured ? allArticles.filter((a) => a.slug !== featured.slug) : allArticles;

  return (
    <>
      <Nav />
      <main>
        <NewsHero latestTitles={latest.map((a) => a.title)} />
        {featured && <NewsFeatured article={featured} />}
        <NewsGrid articles={gridArticles} />

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
