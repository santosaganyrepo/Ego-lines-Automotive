import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { LEGAL_DOCUMENTS } from "@/lib/legal/legal-documents";
import { getPublicSiteSettings } from "@/lib/queries/settings.queries";
import { listSitemapListings } from "@/lib/queries/sitemap.queries";

/**
 * sitemap.xml: the public pages, every published vehicle and spare part, and
 * the legal documents.
 *
 * Only canonical, indexable URLs are listed — no filtered or paginated
 * catalogue views (they canonicalise to the catalogue itself), nothing behind
 * sign-in, no quotation links, and no pages marked noindex (recently viewed).
 *
 * Settings → SEO & social can switch the sitemap off, or indexing off
 * altogether; either publishes an empty sitemap, which is valid XML that
 * lists nothing, and robots.txt stops advertising it.
 *
 * Rendered per request, because listings change all day. If the database
 * cannot be read, the static pages are still published rather than an error.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { seo } = await getPublicSiteSettings();

  if (!seo.sitemapEnabled || !seo.indexingEnabled) {
    return [];
  }

  const now = new Date();
  const url = (path: string) => `${siteConfig.url}${path}`;

  const pages: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: url("/cars"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: url("/spare-parts"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...["/how-it-works", "/track-my-order", "/get-a-quote", "/about-us", "/contact"].map((path) => ({
      url: url(path),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...LEGAL_DOCUMENTS.map((document) => ({
      url: url(document.path),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  let listings: Awaited<ReturnType<typeof listSitemapListings>>;
  try {
    listings = await listSitemapListings();
  } catch (error) {
    console.error("[sitemap] could not read listings; publishing the static pages only", error);
    return pages;
  }

  return [
    ...pages,
    ...listings.vehicles.map((vehicle) => ({
      url: url(`/cars/${vehicle.slug}`),
      lastModified: vehicle.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...listings.spareParts.map((part) => ({
      url: url(`/spare-parts/${part.slug}`),
      lastModified: part.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
