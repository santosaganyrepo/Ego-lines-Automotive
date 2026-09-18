/**
 * The company's own account of itself, as supplied by the business for the
 * About page, grouped by theme rather than kept in its original Q&A order.
 *
 * Deliberately contains no business name: every sentence that names the
 * company is built at render time from Settings (`businessName`), so renaming
 * the business in the dashboard renames it here too. Edit the wording in
 * this file; nothing in the page components needs to change.
 */

export const COMPANY_TAGLINE = "Connecting Africa to the World of Mobility."

export const COMPANY_FOUNDED_YEAR = 2025

export const COMPANY_MISSION =
  "To connect African customers with quality vehicles through reliable international sourcing, competitive pricing and professional service."

export const COMPANY_VISION =
  "To become a leading automotive company in East Africa and one of Africa’s trusted names in vehicle sourcing, importing and mobility solutions."

/** The three facts the homepage leads with. */
export const COMPANY_FACTS = [
  { value: String(COMPANY_FOUNDED_YEAR), label: "Founded" },
  { value: "South Sudan", label: "Where we are based" },
  { value: "East Africa", label: "Where we are growing" },
] as const

export const SOURCING_MARKETS = ["Japan", "South Korea", "China"] as const

export function companyStory(businessName: string): readonly string[] {
  return [
    `${businessName} was founded in ${COMPANY_FOUNDED_YEAR} with the ambition of building a modern, trusted automotive company connecting customers across Africa with quality vehicles from leading international markets.`,
    "We started to make sourcing and importing a vehicle more reliable, transparent and accessible — carefully selected vehicles, competitive pricing and professional service from the first conversation.",
    "Our ambition goes beyond selling vehicles. We are building an automotive brand designed to grow across East Africa and the continent as a whole.",
  ]
}

export const COMPANY_TEAM =
  "The company is driven by a commitment to understanding the needs of African customers, and by building connections with reputable international suppliers, exporters and logistics providers. As we grow, we are building a strong team and strategic partnerships across automotive, logistics, finance and servicing."

export const COMPANY_VALUES = [
  { title: "Integrity", body: "We conduct business honestly and responsibly." },
  { title: "Quality", body: "We aim to provide vehicles that offer reliability and value." },
  { title: "Transparency", body: "Customers should receive clear and accurate information." },
  { title: "Customer focus", body: "We put the customer’s needs at the centre of our service." },
  {
    title: "Innovation & growth",
    body: "We keep looking for better ways to serve customers and to develop the African automotive market.",
  },
] as const

export const COMPANY_DIFFERENCE =
  "We do not simply want to sell vehicles. We want you to have confidence in what you buy — clear information on specifications, mileage, condition and history where available — and our international sourcing network lets us search to your needs, budget and preferences."

/** What is weighed before a vehicle is bought. */
export const SELECTION_CRITERIA = [
  "Vehicle condition",
  "Mileage",
  "Service and maintenance history, where available",
  "Vehicle age",
  "Specifications and features",
  "Market demand",
  "Reliability",
  "Availability of spare parts",
  "Overall value for money",
] as const

export const INSPECTION_NOTE =
  "Before purchasing a vehicle, we verify the available information, documentation and condition through our sourcing and inspection process, so that it meets our standards before it is shipped."

export const AFTER_SALES = {
  intro: "Our relationship with customers does not end when a vehicle is purchased.",
  services: [
    { title: "Documentation", body: "Assistance with your vehicle’s documentation." },
    { title: "Spare parts", body: "Help sourcing the spare parts your vehicle needs." },
    { title: "Servicing", body: "Connections to appropriate servicing and maintenance providers." },
  ],
  terms: "Specific warranty and after-sales terms depend on the individual vehicle and purchase agreement.",
} as const

/** Where the company is heading — the services it plans to offer. */
export const FUTURE_SERVICES = [
  "Genuine spare parts",
  "Vehicle servicing and maintenance",
  "Vehicle sourcing on request",
  "Vehicle import and delivery",
  "Fleet solutions for businesses and organisations",
  "Warranty and protection options",
  "Financing partnerships",
  "Vehicle tracking and delivery updates",
  "Expansion into more African markets",
] as const

export const GROWTH_PATH = [
  { stage: "Today", place: "South Sudan", body: "Serving customers across South Sudan." },
  { stage: "Next", place: "East Africa", body: "Building a wider customer base across the region." },
  { stage: "Ambition", place: "Africa & beyond", body: "A full-service automotive company across the continent." },
] as const

export function companyCommitment(businessName: string): string {
  return `At ${businessName}, we believe reliable transportation plays an important role in the growth of individuals, families and businesses across Africa. From sourcing and inspection to shipping, delivery and after-sales support, we are committed to a seamless automotive experience.`
}
