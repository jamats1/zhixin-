import type { MetadataRoute } from "next";
import {
  fetchSitemapCarParts,
  fetchSitemapVehicles,
} from "@/lib/sanity/product-detail";
import { getSiteUrl } from "@/lib/seo/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const fallback = new Date();

  const staticPaths = [
    "/",
    "/search",
    "/about",
    "/contact",
    "/careers",
    "/feedback",
    "/license",
    "/inquiry",
    "/faq",
    "/mobile",
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: path === "/" ? base : `${base}${path}`,
    lastModified: fallback,
    changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
    priority: path === "/" ? 1 : 0.5,
  }));

  try {
    const [vehicles, parts] = await Promise.all([
      fetchSitemapVehicles(),
      fetchSitemapCarParts(),
    ]);

    for (const v of vehicles) {
      if (!v.slug) continue;
      entries.push({
        url: `${base}/vehicle/${v.slug}`,
        lastModified: v._updatedAt ? new Date(v._updatedAt) : fallback,
        changeFrequency: "weekly",
        priority: 0.85,
      });
    }
    for (const p of parts) {
      if (!p.slug) continue;
      entries.push({
        url: `${base}/car-part/${p.slug}`,
        lastModified: p._updatedAt ? new Date(p._updatedAt) : fallback,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // Sanity unreachable (e.g. local build without env) — home URL still listed
  }

  return entries;
}
