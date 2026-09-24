import { describe, expect, it } from "vitest"

import { siteConfig } from "@/config/site"
import type { PublicSiteSettings } from "@/lib/queries/settings.queries"
import { DEFAULT_CATALOG_DISPLAY } from "@/lib/settings/catalog-display"
import { resolveTrackingStageConfig } from "@/lib/validations/settings.schema"
import { buildPageMetadata, defaultOgImages } from "@/lib/seo/page-metadata"
import { ORGANIZATION_ID, organizationJsonLd, sellerJsonLd, websiteJsonLd } from "@/lib/seo/structured-data"

/**
 * Page metadata and the business's structured data.
 *
 * The defect behind buildPageMetadata: Next.js merges metadata shallowly, so
 * a page that did not declare its own Open Graph / Twitter card inherited the
 * homepage's, and a root-level canonical of "/" would have told search
 * engines that every such page duplicated the homepage. These tests pin that
 * every page's card and canonical describe that page.
 */

function settings(overrides: Partial<PublicSiteSettings> = {}): PublicSiteSettings {
  return {
    businessName: "EGO-Lines Automotive",
    businessDescription: "Vehicles from Japan, South Korea and China, delivered to South Sudan.",
    siteTitle: "EGO-Lines",
    defaultCountry: "SS",
    contact: { phone: "+211 912 345 678", email: "sales@example.com", address: "Juba", whatsappNumber: "", callUsEnabled: true },
    company: { legalName: "", registrationNumber: "", taxNumber: "" },
    hours: null,
    social: [],
    branding: { logoLightUrl: null, logoDarkUrl: null, faviconUrl: null },
    seo: {
      title: "EGO-Lines Automotive — Quality Cars",
      description: "Default description",
      ogImageUrl: null,
      sitemapEnabled: true,
      indexingEnabled: true,
    },
    catalogDisplay: DEFAULT_CATALOG_DISPLAY,
    trackingNumberPrefix: "CLM",
    trackingStages: resolveTrackingStageConfig(null),
    sparePartDeliverySteps: null,
    paymentSchedule: { initial: 50, mombasa: 25, final: 25 },
    ...overrides,
  }
}

describe("buildPageMetadata", () => {
  it("gives a page its own canonical, Open Graph and Twitter card", () => {
    const metadata = buildPageMetadata({
      settings: settings(),
      title: "Contact",
      description: "Contact us.",
      path: "/contact",
    })

    expect(metadata.title).toBe("Contact")
    expect(metadata.alternates).toEqual({ canonical: "/contact" })
    expect(metadata.openGraph).toMatchObject({
      url: `${siteConfig.url}/contact`,
      title: "Contact | EGO-Lines",
      description: "Contact us.",
      siteName: "EGO-Lines",
      locale: "en_GB",
    })
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: "Contact | EGO-Lines" })
    expect(metadata.robots).toBeUndefined()
  })

  it("uses an absolute title unchanged in the social cards", () => {
    const metadata = buildPageMetadata({
      settings: settings(),
      title: { absolute: "EGO-Lines Automotive — Quality Cars" },
      description: "Home",
      path: "/",
    })

    expect(metadata.openGraph).toMatchObject({ url: siteConfig.url, title: "EGO-Lines Automotive — Quality Cars" })
  })

  it("prefers the listing's photograph, else the site-wide image", () => {
    const withPhoto = buildPageMetadata({
      settings: settings(),
      title: "2021 Toyota Harrier",
      description: "…",
      path: "/cars/2021-toyota-harrier",
      images: [{ url: "https://cdn.example/harrier.jpg", alt: "2021 Toyota Harrier" }],
    })
    expect(withPhoto.openGraph?.images).toEqual([{ url: "https://cdn.example/harrier.jpg", alt: "2021 Toyota Harrier" }])

    const without = buildPageMetadata({ settings: settings(), title: "About Us", description: "…", path: "/about-us" })
    expect(without.openGraph?.images).toEqual(defaultOgImages(settings()))
  })

  it("never leaves a page without a sharing image", () => {
    expect(defaultOgImages(settings())[0]?.url).toBe(`${siteConfig.url}/social-image`)

    const uploaded = settings({ seo: { ...settings().seo, ogImageUrl: "https://cdn.example/og.jpg" } })
    expect(defaultOgImages(uploaded)[0]?.url).toBe("https://cdn.example/og.jpg")
  })

  it("passes a page's noindex through", () => {
    const metadata = buildPageMetadata({
      settings: settings(),
      title: "Track My Order",
      description: "…",
      path: "/track-my-order",
      robots: { index: false, follow: false },
    })
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})

describe("business structured data", () => {
  it("publishes only configured facts", () => {
    const data = organizationJsonLd(settings({ contact: { ...settings().contact, phone: "", email: "", address: "" } }))

    expect(data).not.toHaveProperty("telephone")
    expect(data).not.toHaveProperty("email")
    expect(data).not.toHaveProperty("address")
    expect(data).not.toHaveProperty("contactPoint")
    expect(data).not.toHaveProperty("sameAs")
  })

  it("describes the dealer with a crawlable logo and a postal address", () => {
    const data = organizationJsonLd(settings())

    expect(data).toMatchObject({
      "@type": "AutoDealer",
      "@id": ORGANIZATION_ID,
      name: "EGO-Lines Automotive",
      alternateName: "EGO-Lines",
      url: siteConfig.url,
      logo: `${siteConfig.url}/app-icon/icon-512.png`,
      telephone: "+211 912 345 678",
      address: { "@type": "PostalAddress", streetAddress: "Juba", addressCountry: "SS" },
    })
  })

  it("names the website after the business, published by the dealer", () => {
    expect(websiteJsonLd(settings())).toMatchObject({
      "@type": "WebSite",
      name: "EGO-Lines Automotive",
      url: siteConfig.url,
      publisher: { "@id": ORGANIZATION_ID },
    })
  })

  it("links every listing's seller to the same entity", () => {
    expect(sellerJsonLd("EGO-Lines Automotive")["@id"]).toBe(ORGANIZATION_ID)
  })
})
