import type { Metadata } from "next"
import { connection } from "next/server"

import { AboutTeaser } from "@/components/home/about-teaser"
import { BrandsSection } from "@/components/home/brands-section"
import { FeaturedVehicles } from "@/components/home/featured-vehicles"
import { FinalCta } from "@/components/home/final-cta"
import { HomeHero } from "@/components/home/home-hero"
import { HomeFaq, buildHomeFaqs } from "@/components/home/home-faq"
import { JourneyOverview } from "@/components/home/journey-overview"
import { SparePartsTeaser } from "@/components/home/spare-parts-teaser"
import { WhyCrownline } from "@/components/home/why-crownline"
import { getInventorySummary, listHomepageVehicles } from "@/lib/queries/public-vehicle.queries"
import {
  listFeaturedSpareParts,
  listPublicSparePartCategories,
} from "@/lib/queries/public-spare-part.queries"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"
import { buildPageMetadata } from "@/lib/seo/page-metadata"
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/structured-data"
import { serializeJsonLd } from "@/lib/utils/json-ld"
import { buildGeneralWhatsAppMessage, buildWhatsAppUrl } from "@/lib/utils/whatsapp"

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings()

  // The configured SEO title and description (Settings → SEO & social), used
  // as they are rather than prefixed: the homepage title is already the full
  // brand title.
  return buildPageMetadata({
    settings,
    title: { absolute: settings.seo.title },
    description: settings.seo.description,
    path: "/",
  })
}

/**
 * The homepage.
 *
 * Built around three things a visitor comes to do — browse vehicles, ask for
 * a quote, understand how importing works — in the order the brief sets out:
 * who the dealership is, the vehicles it has chosen to feature, the makes it
 * supplies, a short introduction linking to About Us, why
 * buy here, how importing works, spare parts, the questions buyers ask, and a
 * last invitation to ask for the car they did not find.
 *
 * Every product and count on it is read from the published inventory and
 * the dashboard's "Feature on the homepage" switches, and every contact
 * action from Settings, so the page changes when
 * the business does without anyone editing it.
 */
export default async function HomePage() {
  /**
   * Rendered per request, like the catalogue and every listing page.
   *
   * A prerendered homepage would be a snapshot of the inventory at build time,
   * and the listings on it change from places that do not revalidate `/` — an
   * order completing marks its car sold, a cancellation puts it back on sale.
   * The reads are a handful of small, indexed queries, and the settings among
   * them are already cached under their tag.
   */
  await connection()

  const [settings, vehicles, inventory, parts, partCategories] = await Promise.all([
    getPublicSiteSettings(),
    listHomepageVehicles(),
    getInventorySummary(),
    listFeaturedSpareParts(),
    listPublicSparePartCategories(),
  ])

  const showQuote = settings.catalogDisplay.actions.getQuote

  const whatsappUrl = buildWhatsAppUrl({
    phoneNumber: settings.contact.whatsappNumber,
    message: buildGeneralWhatsAppMessage(settings.businessName),
  })

  return (
    /*
      The homepage is a dark showroom from top to bottom. `dark` re-points the
      theme tokens for everything inside, so shared components — vehicle
      cards, spare-part cards, the tracking form, buttons — render in their
      dark treatment without a variant of their own.
    */
    <div className="dark bg-background text-foreground">
      <HomeJsonLd settings={settings} />

      <HomeHero businessName={settings.businessName} showQuote={showQuote} />
      <FeaturedVehicles vehicles={vehicles} totalVehicles={inventory.vehicleCount} />
      <BrandsSection showQuote={showQuote} />
      <AboutTeaser businessName={settings.businessName} />
      <WhyCrownline businessName={settings.businessName} />
      <JourneyOverview />
      <SparePartsTeaser parts={parts} categories={partCategories} />
      <HomeFaq
        faqs={buildHomeFaqs({ businessName: settings.businessName, paymentSchedule: settings.paymentSchedule })}
      />
      <FinalCta whatsappUrl={whatsappUrl} showQuote={showQuote} />
    </div>
  )
}

/**
 * The dealership and the website as structured data, for search results
 * (brief §18) — see src/lib/seo/structured-data.ts for what is emitted and
 * why. One `@graph`, so the WebSite's publisher resolves to the dealer.
 */
function HomeJsonLd({ settings }: { settings: Awaited<ReturnType<typeof getPublicSiteSettings>> }) {
  const data = {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(settings), websiteJsonLd(settings)],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
}
