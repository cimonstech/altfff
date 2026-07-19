/**
 * Shape of a row from the real news_posts table (migration 0001), as
 * selected by the public news pages. Replaces the old placeholder
 * NewsArticle type from data/news.ts (deleted - that data was always
 * explicitly flagged as invented). No `category` or `externalUrl` here:
 * neither exists on the real schema, so the category-filter and
 * external-link-article UI that existed against the placeholder data was
 * dropped, not adapted around a column that was never real.
 */
export type NewsPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content_html: string | null;
  published_at: string | null;
  created_at: string;
};
