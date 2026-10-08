import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Admin dashboard is real; keep it out of search indexes.
        // /dashboard reserved in case a non-admin dashboard route is added later.
        disallow: ["/admin", "/dashboard"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
