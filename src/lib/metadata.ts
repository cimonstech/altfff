import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

/**
 * Builds a page's title/description/canonical/OpenGraph/Twitter metadata
 * from one shared shape, so every page gets the same fields without
 * repeating the boilerplate - and without the risk this task exists to
 * guard against: a description copy-pasted from another page and never
 * updated for its own.
 *
 * `path` is the route's own path (e.g. "/about", "/" for the homepage),
 * used to build the absolute canonical URL and the OG url. `image`
 * defaults to SITE.ogImage - see the comment on that constant: it's the
 * site icon, a placeholder until real per-page 1200x630 OG images exist.
 */
export function buildMetadata({
  title,
  description,
  path,
  image = SITE.ogImage,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const url = `${SITE.url}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
