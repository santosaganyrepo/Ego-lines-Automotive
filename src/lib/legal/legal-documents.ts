import { LegalDocumentKind } from "@/generated/prisma/enums"

/**
 * The four legal documents: where each lives on the site and in the
 * dashboard, and how it is named in links.
 *
 * Pure and browser-safe — the footer, the quote form and the dashboard all
 * build their links from here, so a document is never linked by a path typed
 * in two places.
 */
export interface LegalDocumentMeta {
  kind: LegalDocumentKind
  /** URL segment, both on the site (`/terms-of-sale`) and in Settings. */
  slug: string
  /** Public page path. */
  path: string
  /** Short name for footer links and navigation. */
  label: string
  /** One line for the dashboard's document list. */
  purpose: string
}

export const LEGAL_DOCUMENTS: readonly LegalDocumentMeta[] = [
  {
    kind: LegalDocumentKind.TERMS_OF_SALE,
    slug: "terms-of-sale",
    path: "/terms-of-sale",
    label: "Terms of Sale",
    purpose: "Quotations, payment stages, delivery, cancellations and refunds for vehicles and parts.",
  },
  {
    kind: LegalDocumentKind.TERMS_OF_USE,
    slug: "terms-of-use",
    path: "/terms-of-use",
    label: "Terms of Use",
    purpose: "The rules for using the website, its listings, forms and tracking.",
  },
  {
    kind: LegalDocumentKind.PRIVACY_POLICY,
    slug: "privacy-policy",
    path: "/privacy-policy",
    label: "Privacy Policy",
    purpose: "What personal information is collected, why, who it is shared with and customers’ rights.",
  },
  {
    kind: LegalDocumentKind.PAYMENT_SAFETY,
    slug: "payment-safety",
    path: "/payment-safety",
    label: "Payment Safety",
    purpose: "Official payment accounts and how customers can recognise and avoid payment scams.",
  },
] as const

export function legalDocumentMeta(kind: LegalDocumentKind): LegalDocumentMeta {
  const meta = LEGAL_DOCUMENTS.find((document) => document.kind === kind)
  if (!meta) throw new Error(`Unknown legal document: ${kind}`)
  return meta
}

export function legalDocumentBySlug(slug: string): LegalDocumentMeta | null {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug) ?? null
}

/** Limits shared by the Zod schemas, the editor's counters and the database CHECKs. */
export const LEGAL_LIMITS = {
  titleMax: 120,
  summaryMax: 3000,
  headingMax: 160,
  bodyMax: 20_000,
  sectionsMax: 60,
} as const
