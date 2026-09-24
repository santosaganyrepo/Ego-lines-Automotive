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

  const url = (path: string) => `${siteConfig.url}${path}`;

  let listings: Awaited<ReturnType<typeof listSitemapListings>> | null = null;
  try {
    listings = await listSitemapListings();
  } catch (error) {
    console.error("[sitemap] could not read listings; publishing the static pages only", error);
  }

  /**
   * `lastmod` only where it is true. The home page and the two catalogues
   * change when a listing does, so they carry the newest listing's date;
   * the fixed pages carry none. A date that is always "now" is one search
   * engines learn to ignore — for every URL in the file, not just that one.
   */
  const newest = (entries: { updatedAt: Date }[] | undefined) =>
    entries && entries.length > 0 ? entries[0]!.updatedAt : undefined;
  const vehiclesChanged = newest(listings?.vehicles);
  const partsChanged = newest(listings?.spareParts);
  const anyChanged =
    vehiclesChanged && partsChanged
      ? new Date(Math.max(vehiclesChanged.getTime(), partsChanged.getTime()))
      : (vehiclesChanged ?? partsChanged);

  const pages: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: anyChanged, changeFrequency: "daily", priority: 1 },
    { url: url("/cars"), lastModified: vehiclesChanged, changeFrequency: "daily", priority: 0.9 },
    { url: url("/spare-parts"), lastModified: partsChanged, changeFrequency: "daily", priority: 0.9 },
    ...["/how-it-works", "/get-a-quote", "/about-us", "/contact", "/track-my-order"].map((path) => ({
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

  if (!listings) return pages;

  return [
    ...pages,
    ...listings.vehicles.map((vehicle) => ({
      url: url(`/cars/${vehicle.slug}`),
      lastModified: vehicle.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(vehicle.imageUrl ? { images: [vehicle.imageUrl] } : {}),
    })),
    ...listings.spareParts.map((part) => ({
      url: url(`/spare-parts/${part.slug}`),
      lastModified: part.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      ...(part.imageUrl ? { images: [part.imageUrl] } : {}),
    })),
  ];
}
