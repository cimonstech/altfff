import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /admin and /dashboard aren't built yet, but reserved disallowed
        // now so they're already correct once either ships.
        disallow: ["/admin", "/dashboard"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
