import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { tradeShowEntries } from "@/data/tradeShowGuide";

/** Keep published blog URLs in sync with /blog (ISR revalidate = 60). */
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_posts")
    .select("slug, published_at, created_at")
    .eq("published", true);
  if (error) {
    console.error("Failed to load news posts for sitemap:", error);
  }
  const posts = data ?? [];

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/exhibiting`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/visit`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/sponsorship`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE.url}/media/in-the-news`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE.url}/trade-show-guide`, changeFrequency: "weekly", priority: 0.8 },
    ...tradeShowEntries.map((entry) => ({
      url: `${SITE.url}/trade-show-guide/${entry.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    { url: `${SITE.url}/altfff2026`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/altfff2026/acknowledgement`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/altfff2026/gallery`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE.url}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE.url}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const articlePages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE.url}/blog/${p.slug}`,
    lastModified: p.published_at ?? p.created_at,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticPages, ...articlePages];
}
