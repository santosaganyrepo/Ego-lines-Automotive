import { siteConfig } from "@/config/site"
import { SparePartAvailability } from "@/generated/prisma/enums"
import { SPARE_PART_AVAILABILITY_LABELS } from "@/lib/constants/spare-part-options"
import { COUNTRY_LABELS, FUEL_TYPE_LABELS, TRANSMISSION_LABELS } from "@/lib/constants/vehicle-options"
import { LEGAL_DOCUMENTS } from "@/lib/legal/legal-documents"
import { listPublishedSpareParts } from "@/lib/queries/public-spare-part.queries"
import { listPublishedVehicles } from "@/lib/queries/public-vehicle.queries"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"
import { formatCurrency } from "@/lib/utils/format-currency"

/**
 * /llms.txt — a plain Markdown summary of the business for AI assistants
 * (ChatGPT, Claude, Perplexity and others), following the llms.txt
 * convention: who the business is, how buying works, where the pages are,
 * and what is for sale right now, with links.
 *
 * Everything comes from the same places the website reads, under the same
 * visibility rules: a price or detail hidden in Settings → Catalogue display
 * (or on a listing) is absent here too, and only published listings appear.
 * No customer, order or internal information is ever included.
 *
 * Regenerated at most hourly. With indexing switched off in Settings → SEO &
 * social it answers 404, like the rest of the site's crawler surface.
 */
export const revalidate = 3600

/** Enough to describe a dealership's stock without an endless file. */
const VEHICLE_PAGES = 20 // × 12 per page
const PART_PAGES = 10 // × 24 per page

function label<T extends string>(labels: Record<T, string>, value: string | null): string | null {
  return value ? ((labels as Record<string, string>)[value] ?? value) : null
}

/** Markdown-safe single line: no line breaks, no link syntax injected by a listing name. */
function inline(text: string): string {
  return text.replace(/\s+/g, " ").replace(/[[\]]/g, "").trim()
}

export async function GET() {
  const settings = await getPublicSiteSettings()
  if (!settings.seo.indexingEnabled) return new Response("Not found", { status: 404 })

  const url = (path: string) => `${siteConfig.url}${path}`
  const { businessName, contact, paymentSchedule } = settings

  const [vehicles, parts] = await Promise.all([
    listPublishedVehicles({ page: VEHICLE_PAGES, through: true }).catch((error: unknown) => {
      console.error("[llms.txt] could not list vehicles", error)
      return null
    }),
    listPublishedSpareParts({ page: PART_PAGES, through: true }).catch((error: unknown) => {
      console.error("[llms.txt] could not list spare parts", error)
      return null
    }),
  ])

  const lines: string[] = [
    `# ${inline(businessName)}`,
    "",
    `> ${inline(settings.businessDescription)}`,
    "",
    `${inline(businessName)} is a vehicle dealership and import business serving South Sudan. It sources used and new vehicles from Japan, South Korea and China, ships them through the port of Mombasa (Kenya), clears them and transports them by road to South Sudan, and sells spare parts. All prices are in US dollars.`,
    "",
    "## How buying works",
    "",
    "- Customers browse the catalogue or request a quotation for any vehicle or part; quotations are free and confirm the full price, including shipping and clearing.",
    `- Vehicles are paid in stages: ${paymentSchedule.initial}% when the order is confirmed, ${paymentSchedule.mombasa}% when the vehicle reaches Mombasa, and ${paymentSchedule.final}% before handover.`,
    "- Spare parts are paid in full before dispatch.",
    "- Every order receives a tracking number, followed on the Track My Order page.",
    "- Payment is only ever made by bank transfer or mobile money into the company's official accounts (see Payment Safety).",
    "",
    "## Contact",
    "",
    ...[
      contact.phone ? `- Phone: ${inline(contact.phone)}` : null,
      contact.whatsappNumber ? `- WhatsApp: ${inline(contact.whatsappNumber)}` : null,
      contact.email ? `- Email: ${inline(contact.email)}` : null,
      contact.address ? `- Address: ${inline(contact.address)}` : null,
      ...(settings.hours ?? []).map((line) => `- Hours: ${inline(line)}`),
      `- Contact page: ${url("/contact")}`,
    ].filter((line): line is string => line !== null),
    "",
    "## Main pages",
    "",
    `- [Vehicles for sale](${url("/cars")}): the full catalogue, searchable by make, model, year and body type.`,
    `- [Spare parts](${url("/spare-parts")}): parts by category, with fitment for each part.`,
    `- [How it works](${url("/how-it-works")}): the import journey step by step, and the payment stages.`,
    `- [Get a quote](${url("/get-a-quote")}): request any vehicle or part not listed.`,
    `- [Track my order](${url("/track-my-order")}): follow an order with its tracking number.`,
    `- [About us](${url("/about-us")})`,
    "",
  ]

  if (vehicles && vehicles.vehicles.length > 0) {
    lines.push(`## Vehicles for sale (${vehicles.total})`, "")
    for (const vehicle of vehicles.vehicles) {
      const name = inline([vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" "))
      const facts = [
        vehicle.price !== null ? formatCurrency(vehicle.price) : "price on request",
        vehicle.mileageKm !== null ? `${vehicle.mileageKm.toLocaleString("en-GB")} km` : null,
        label(FUEL_TYPE_LABELS, vehicle.fuelType),
        label(TRANSMISSION_LABELS, vehicle.transmission),
        vehicle.engineSize ? inline(vehicle.engineSize) : null,
        vehicle.countryOfOrigin ? `from ${label(COUNTRY_LABELS, vehicle.countryOfOrigin)}` : null,
      ].filter(Boolean)
      lines.push(`- [${name}](${url(`/cars/${vehicle.slug}`)}): ${facts.join(", ")}`)
    }
    if (vehicles.total > vehicles.vehicles.length) lines.push(`- More: ${url("/cars")}`)
    lines.push("")
  }

  if (parts && parts.parts.length > 0) {
    lines.push(`## Spare parts (${parts.total})`, "")
    for (const part of parts.parts) {
      const facts = [
        part.brand ? inline(part.brand) : null,
        part.categoryName ? inline(part.categoryName) : null,
        part.price !== null ? formatCurrency(part.price) : "price on request",
        part.availability ? SPARE_PART_AVAILABILITY_LABELS[part.availability as SparePartAvailability] : null,
      ].filter(Boolean)
      lines.push(`- [${inline(part.name)}](${url(`/spare-parts/${part.slug}`)}): ${facts.join(", ")}`)
    }
    if (parts.total > parts.parts.length) lines.push(`- More: ${url("/spare-parts")}`)
    lines.push("")
  }

  lines.push(
    "## Policies",
    "",
    ...LEGAL_DOCUMENTS.map((document) => `- [${document.label}](${url(document.path)}): ${document.purpose}`),
    "",
    "## Optional",
    "",
    `- [Sitemap](${url("/sitemap.xml")})`,
    ""
  )

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  })
}
