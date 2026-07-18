import type { MetadataRoute } from "next";
import { getAllArticles } from "@/data/news";
import { SITE } from "@/lib/constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllArticles();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/exhibiting`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/visit`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/sponsorship`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/news`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE.url}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE.url}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE.url}/news/${a.slug}`,
    lastModified: a.date,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticPages, ...articlePages];
}
