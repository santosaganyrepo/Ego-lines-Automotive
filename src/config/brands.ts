/**
 * The vehicle makes the dealership deals in, as the business itself listed
 * them (About → "What car brands do you deal with?"). Shown on the homepage
 * and the About page, so the two can never list different makes.
 *
 * ── The logo files ────────────────────────────────────────────────────
 * Each is a static SVG under public/images/brands, cropped to the mark's own
 * bounds so every logo can be sized by its shape rather than by the padding
 * its source happened to carry. They are rendered through <img>, never
 * inlined, and none carries script or an external reference.
 *
 * Every mark is the property of its manufacturer and is shown only to say
 * which makes are sold here. The files themselves come from sources that
 * allow reuse, recorded per brand below; the one that requires attribution
 * (Changan) is credited wherever the logos are shown — see `BRAND_CREDITS`.
 *
 * `ratio` is width ÷ height of the file's viewBox (the cropped artwork plus
 * a hairline margin); tests/unit/vehicle-brands.test.ts keeps the two in
 * step. It drives optical sizing: a long wordmark is drawn shorter than a
 * square emblem so the row reads as one weight.
 */

export type BrandMarket = "Japan" | "South Korea" | "China"

export interface VehicleBrand {
  name: string
  slug: string
  market: BrandMarket
  ratio: number
}

export const VEHICLE_BRANDS: readonly VehicleBrand[] = [
  { name: "Toyota", slug: "toyota", market: "Japan", ratio: 1.46 },
  { name: "Lexus", slug: "lexus", market: "Japan", ratio: 1.35 },
  { name: "Nissan", slug: "nissan", market: "Japan", ratio: 1.19 },
  { name: "Honda", slug: "honda", market: "Japan", ratio: 1.22 },
  { name: "Mazda", slug: "mazda", market: "Japan", ratio: 1.24 },
  { name: "Mitsubishi", slug: "mitsubishi", market: "Japan", ratio: 1.15 },
  { name: "Subaru", slug: "subaru", market: "Japan", ratio: 1.69 },
  { name: "Suzuki", slug: "suzuki", market: "Japan", ratio: 0.99 },
  { name: "Isuzu", slug: "isuzu", market: "Japan", ratio: 5.32 },
  { name: "Hyundai", slug: "hyundai", market: "South Korea", ratio: 1.91 },
  { name: "Kia", slug: "kia", market: "South Korea", ratio: 4 },
  { name: "BYD", slug: "byd", market: "China", ratio: 4.8 },
  { name: "Geely", slug: "geely", market: "China", ratio: 1.83 },
  { name: "Changan", slug: "changan", market: "China", ratio: 1.46 },
  { name: "Haval", slug: "haval", market: "China", ratio: 7.17 },
]

export function brandLogoSrc(brand: VehicleBrand): string {
  return `/images/brands/${brand.slug}.svg`
}

/**
 * Where each logo file came from. Simple Icons and the public-domain Wikimedia
 * files need no credit; Changan's emblem is CC BY-SA 4.0 and must be credited
 * wherever it is displayed.
 */
export const BRAND_LOGO_SOURCES: Record<string, string> = {
  toyota: "Simple Icons (CC0)",
  nissan: "Simple Icons (CC0)",
  honda: "Simple Icons (CC0)",
  mazda: "Simple Icons (CC0)",
  mitsubishi: "Simple Icons (CC0)",
  subaru: "Simple Icons (CC0)",
  suzuki: "Simple Icons (CC0)",
  hyundai: "Simple Icons (CC0)",
  kia: "Simple Icons (CC0)",
  lexus: "Wikimedia Commons, File:Lexus Logo.svg (CC0)",
  isuzu: "Wikimedia Commons, File:Isuzu.svg (public domain)",
  byd: "Wikimedia Commons, File:BYD Auto 2022 logo.svg (public domain)",
  geely: "Wikimedia Commons, File:Geely Auto 2023.svg (public domain)",
  haval: "Wikimedia Commons, File:Haval 2023 logo.svg (public domain)",
  changan: "Wikimedia Commons, File:Changan icon.svg by 292Jacob (CC BY-SA 4.0)",
}

/** The attribution line shown beneath any display of the logos. */
export const BRAND_CREDITS = {
  notice: "Brand names and logos are trademarks of their respective owners and are shown to identify the makes we supply.",
  changan: {
    text: "Changan emblem by 292Jacob, CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:Changan_icon.svg",
    licenseHref: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
} as const
