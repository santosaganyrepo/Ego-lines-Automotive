import "server-only"

import { prisma } from "@/lib/prisma"
import { publicSparePartWhere } from "@/lib/queries/public-spare-part.queries"
import { publicVehicleWhere } from "@/lib/queries/public-vehicle.queries"

/**
 * The individual listings the sitemap advertises — published ones only, by
 * the same visibility rule the catalogue uses, so a draft, sold or archived
 * listing is never announced to search engines.
 *
 * Bounded well under the 50,000-URL sitemap limit: a dealership far larger
 * than this one would move to a sitemap index before approaching it.
 */
const MAX_LISTINGS = 10_000

export interface SitemapListing {
  slug: string
  updatedAt: Date
}

export async function listSitemapListings(): Promise<{ vehicles: SitemapListing[]; spareParts: SitemapListing[] }> {
  const [vehicles, spareParts] = await Promise.all([
    prisma.vehicle.findMany({
      where: publicVehicleWhere(),
      orderBy: { updatedAt: "desc" },
      take: MAX_LISTINGS,
      select: { slug: true, updatedAt: true },
    }),
    prisma.sparePart.findMany({
      where: publicSparePartWhere(),
      orderBy: { updatedAt: "desc" },
      take: MAX_LISTINGS,
      select: { slug: true, updatedAt: true },
    }),
  ])
  return { vehicles, spareParts }
}
