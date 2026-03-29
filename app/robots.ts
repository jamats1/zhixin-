import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  const host = new URL(base).host;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/studio/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host,
  };
}
