import "server-only"

import { prisma } from "@/lib/prisma"
import { publicSparePartWhere } from "@/lib/queries/public-spare-part.queries"
import { publicVehicleWhere } from "@/lib/queries/public-vehicle.queries"
import { sparePartPhotoPublicUrl } from "@/lib/storage/spare-part-media"
import { vehiclePhotoPublicUrl } from "@/lib/storage/vehicle-media"

/**
 * The individual listings the sitemap advertises — published ones only, by
 * the same visibility rule the catalogue uses, so a draft, sold or archived
 * listing is never announced to search engines.
 *
 * Each carries its main photograph, which the sitemap lists as an image of
 * the page: that is how listing photographs reach image search, where a
 * large share of "Toyota Harrier South Sudan"-style searches start.
 *
 * Bounded well under the 50,000-URL sitemap limit: a dealership far larger
 * than this one would move to a sitemap index before approaching it.
 */
const MAX_LISTINGS = 10_000

const MAIN_PHOTO = {
  where: { deletedAt: null, isPrimary: true },
  select: { storagePath: true },
  take: 1,
} as const

export interface SitemapListing {
  slug: string
  updatedAt: Date
  imageUrl: string | null
}

export async function listSitemapListings(): Promise<{ vehicles: SitemapListing[]; spareParts: SitemapListing[] }> {
  const [vehicles, spareParts] = await Promise.all([
    prisma.vehicle.findMany({
      where: publicVehicleWhere(),
      orderBy: { updatedAt: "desc" },
      take: MAX_LISTINGS,
      select: { slug: true, updatedAt: true, photos: MAIN_PHOTO },
    }),
    prisma.sparePart.findMany({
      where: publicSparePartWhere(),
      orderBy: { updatedAt: "desc" },
      take: MAX_LISTINGS,
      select: { slug: true, updatedAt: true, photos: MAIN_PHOTO },
    }),
  ])

  return {
    vehicles: vehicles.map(({ slug, updatedAt, photos }) => ({
      slug,
      updatedAt,
      imageUrl: photos[0] ? vehiclePhotoPublicUrl(photos[0].storagePath) : null,
    })),
    spareParts: spareParts.map(({ slug, updatedAt, photos }) => ({
      slug,
      updatedAt,
      imageUrl: photos[0] ? sparePartPhotoPublicUrl(photos[0].storagePath) : null,
    })),
  }
}
