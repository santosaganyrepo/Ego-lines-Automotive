import { siteConfig } from "@/config/site"
import type { PublicSiteSettings } from "@/lib/queries/settings.queries"
import { DEFAULT_OG_IMAGE_PATH } from "@/lib/seo/page-metadata"

/**
 * The business itself as schema.org data — shared by the homepage (where it
 * is published in full) and every listing (where it is referenced as the
 * seller), so search engines see one entity rather than a slightly different
 * dealer on every page.
 *
 * Only configured facts are emitted: an empty telephone or address would do
 * the listing more harm than none, and anything invented (a rating, opening
 * hours we cannot parse) would be a false statement about a real business.
 * Every value comes from Settings, so a rebrand or a new number changes it.
 */

/** Stable identifiers, so the entities on different pages join up. */
export const ORGANIZATION_ID = `${siteConfig.url}/#organization`
export const WEBSITE_ID = `${siteConfig.url}/#website`

/**
 * The logo search engines show beside the business.
 *
 * The light-background wordmark first, because Google renders the logo on
 * white; then the generated square app icon, which always exists (it falls
 * back to the brand monogram), so the field is never empty.
 */
function logoUrl(settings: PublicSiteSettings): string {
  return settings.branding.logoLightUrl ?? `${siteConfig.url}/app-icon/icon-512.png`
}

export function organizationJsonLd(settings: PublicSiteSettings) {
  const { contact, company } = settings

  return {
    "@type": "AutoDealer",
    "@id": ORGANIZATION_ID,
    name: settings.businessName,
    ...(settings.siteTitle !== settings.businessName ? { alternateName: settings.siteTitle } : {}),
    description: settings.businessDescription,
    url: siteConfig.url,
    logo: logoUrl(settings),
    image: settings.seo.ogImageUrl ?? `${siteConfig.url}${DEFAULT_OG_IMAGE_PATH}`,
    areaServed: { "@type": "Country", name: "South Sudan" },
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: contact.address,
            addressCountry: settings.defaultCountry,
          },
        }
      : {}),
    ...(contact.phone || contact.email
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            ...(contact.phone ? { telephone: contact.phone } : {}),
            ...(contact.email ? { email: contact.email } : {}),
            areaServed: settings.defaultCountry,
            availableLanguage: ["English"],
          },
        }
      : {}),
    ...(company.legalName ? { legalName: company.legalName } : {}),
    ...(company.taxNumber ? { taxID: company.taxNumber } : {}),
    ...(settings.social.length > 0 ? { sameAs: settings.social.map((link) => link.url) } : {}),
  }
}

/**
 * The WebSite entity — what Google reads to choose the *site name* shown
 * above a result, which is how a search for the business name is answered
 * with the business name rather than the domain.
 */
export function websiteJsonLd(settings: PublicSiteSettings) {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: settings.businessName,
    ...(settings.siteTitle !== settings.businessName ? { alternateName: settings.siteTitle } : {}),
    url: siteConfig.url,
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
  }
}

/** The seller on a listing's Offer: the same entity the homepage publishes. */
export function sellerJsonLd(sellerName: string) {
  return { "@type": "AutoDealer", "@id": ORGANIZATION_ID, name: sellerName, url: siteConfig.url }
}
