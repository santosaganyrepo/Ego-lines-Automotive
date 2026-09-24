import type { Metadata } from "next"

import { siteConfig } from "@/config/site"
import type { PublicSiteSettings } from "@/lib/queries/settings.queries"

/**
 * Metadata for one public page: title, description, canonical URL, and the
 * Open Graph and Twitter cards, all describing *this* page.
 *
 * ── Why every public page goes through this ───────────────────────────
 * Next.js merges metadata between segments shallowly (see "Merging" in
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
 * generate-metadata.md): a page that sets `openGraph` replaces the root
 * layout's object outright — losing `siteName`, `locale` and the default
 * image — and a page that does *not* set it inherits the homepage's card
 * wholesale, so a shared link to Contact would preview as the homepage.
 * `twitter` behaves the same way. Building the whole set in one place is
 * the only way every page gets a complete card that is about itself.
 *
 * `title` is the page's own title; the root layout's template appends the
 * configured site title in the browser tab. The social cards are not
 * templated by Next, so the suffix is added here. Pass `{ absolute }` for a
 * page whose title already is the full title (the homepage).
 */

export const OG_LOCALE = "en_GB"

/** 1200 × 630 is the size every major preview surface is designed around. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const

/** The branded card drawn by src/app/social-image/route.tsx. */
export const DEFAULT_OG_IMAGE_PATH = "/social-image"

type OgImage = { url: string; width?: number; height?: number; alt: string }

/**
 * The site-wide sharing image: the one uploaded in Settings → SEO & social,
 * else the generated brand card, so a shared link is never imageless.
 */
export function defaultOgImages(settings: PublicSiteSettings): OgImage[] {
  return [
    {
      url: settings.seo.ogImageUrl ?? `${siteConfig.url}${DEFAULT_OG_IMAGE_PATH}`,
      ...OG_IMAGE_SIZE,
      alt: settings.businessName,
    },
  ]
}

/** An absolute URL on the canonical origin, from a site path. */
export function absoluteUrl(path: string): string {
  return path === "/" ? siteConfig.url : `${siteConfig.url}${path}`
}

interface PageMetadataInput {
  settings: PublicSiteSettings
  title: string | { absolute: string }
  description: string
  /** The page's canonical path, e.g. `/cars/2021-toyota-harrier`. */
  path: string
  /** A listing's own photographs; the site-wide image is used otherwise. */
  images?: OgImage[]
  robots?: Metadata["robots"]
}

export function buildPageMetadata({
  settings,
  title,
  description,
  path,
  images,
  robots,
}: PageMetadataInput): Metadata {
  const socialTitle = typeof title === "string" ? `${title} | ${settings.siteTitle}` : title.absolute
  const socialImages = images && images.length > 0 ? images : defaultOgImages(settings)

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: settings.siteTitle,
      locale: OG_LOCALE,
      url: absoluteUrl(path),
      title: socialTitle,
      description,
      images: socialImages,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: socialImages.map((image) => ({ url: image.url, alt: image.alt })),
    },
    ...(robots ? { robots } : {}),
  }
}
