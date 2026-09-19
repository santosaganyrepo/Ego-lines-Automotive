import "server-only"

import { unstable_cache } from "next/cache"

import { Prisma } from "@/generated/prisma/client"
import type { LegalDocumentKind } from "@/generated/prisma/enums"
import { DEFAULT_LEGAL_DOCUMENTS } from "@/lib/legal/default-documents"
import { prisma } from "@/lib/prisma"

/**
 * Reads for the legal documents (Terms of Sale, Terms of Use, Privacy Policy,
 * Payment Safety).
 *
 * The public pages read through a cache tagged `legal-documents`, which every
 * write in legal.actions.ts expires — so an edit in the dashboard is live on
 * the next request, and otherwise these pages cost no database work.
 */

export const LEGAL_DOCUMENTS_CACHE_TAG = "legal-documents"

/* ── Public ────────────────────────────────────────────────────────── */

export interface PublicLegalSection {
  id: string
  heading: string
  body: string
}

export interface PublicLegalDocument {
  kind: LegalDocumentKind
  title: string
  summary: string
  /**
   * ISO date of the last edit, or null while the document is still the
   * wording the site shipped with (it has not been opened in the dashboard).
   * A string, not a Date: the cache stores JSON.
   */
  updatedAt: string | null
  /** Published sections only, in order. */
  sections: PublicLegalSection[]
}

function defaultDocument(kind: LegalDocumentKind): PublicLegalDocument {
  const document = DEFAULT_LEGAL_DOCUMENTS[kind]

  return {
    kind,
    title: document.title,
    summary: document.summary,
    updatedAt: null,
    sections: document.sections
      .filter((section) => section.isVisible !== false)
      .map((section, index) => ({ id: `default-${index}`, heading: section.heading, body: section.body })),
  }
}

const readPublicLegalDocument = unstable_cache(
  async (kind: LegalDocumentKind): Promise<PublicLegalDocument> => {
    const document = await prisma.legalDocument.findUnique({
      where: { kind },
      select: {
        title: true,
        summary: true,
        updatedAt: true,
        sections: {
          where: { isVisible: true },
          orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true, heading: true, body: true },
        },
      },
    })

    if (!document) return defaultDocument(kind)

    return {
      kind,
      title: document.title,
      summary: document.summary,
      updatedAt: document.updatedAt.toISOString(),
      sections: document.sections,
    }
  },
  ["legal-documents", "public"],
  { tags: [LEGAL_DOCUMENTS_CACHE_TAG] }
)

/**
 * A document as customers see it.
 *
 * A database failure is deliberately not papered over with the shipped
 * wording: if the dealership has changed its terms, publishing the originals
 * instead would misstate them. The page's error boundary handles it.
 */
export function getPublicLegalDocument(kind: LegalDocumentKind): Promise<PublicLegalDocument> {
  return readPublicLegalDocument(kind)
}

/* ── Dashboard ─────────────────────────────────────────────────────── */

export interface AdminLegalSection {
  id: string
  heading: string
  body: string
  isVisible: boolean
  displayOrder: number
  updatedAt: Date
  updatedByName: string | null
}

export interface AdminLegalDocument {
  kind: LegalDocumentKind
  title: string
  summary: string
  updatedAt: Date
  sections: AdminLegalSection[]
}

/**
 * Copies the shipped wording into the database the first time a document is
 * opened in the dashboard, so there is something to edit. Idempotent: a
 * document that already exists is left exactly as it is, and two
 * administrators opening it at the same moment cannot create it twice (the
 * kind is the primary key, and the loser's transaction rolls back whole).
 */
export async function ensureLegalDocument(kind: LegalDocumentKind): Promise<void> {
  const exists = await prisma.legalDocument.findUnique({ where: { kind }, select: { kind: true } })
  if (exists) return

  const template = DEFAULT_LEGAL_DOCUMENTS[kind]

  try {
    await prisma.$transaction(async (tx) => {
      await tx.legalDocument.create({ data: { kind, title: template.title, summary: template.summary } })
      await tx.legalSection.createMany({
        data: template.sections.map((section, index) => ({
          documentKind: kind,
          heading: section.heading,
          body: section.body,
          isVisible: section.isVisible !== false,
          displayOrder: index,
        })),
      })
    })
  } catch (error) {
    // Someone else created it between the read and the write — the outcome
    // this function exists to produce.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return
    throw error
  }
}

export async function getLegalDocumentForAdmin(kind: LegalDocumentKind): Promise<AdminLegalDocument> {
  await ensureLegalDocument(kind)

  const document = await prisma.legalDocument.findUniqueOrThrow({
    where: { kind },
    select: {
      title: true,
      summary: true,
      updatedAt: true,
      sections: {
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          heading: true,
          body: true,
          isVisible: true,
          displayOrder: true,
          updatedAt: true,
          updatedBy: { select: { displayName: true } },
        },
      },
    },
  })

  return {
    kind,
    title: document.title,
    summary: document.summary,
    updatedAt: document.updatedAt,
    sections: document.sections.map(({ updatedBy, ...section }) => ({
      ...section,
      updatedByName: updatedBy?.displayName ?? null,
    })),
  }
}

export interface LegalDocumentOverview {
  kind: LegalDocumentKind
  /** Null while the document is still the shipped wording. */
  updatedAt: Date | null
  sectionCount: number
  hiddenCount: number
}

/** One row per document for Settings → Legal documents. */
export async function listLegalDocumentsForAdmin(): Promise<LegalDocumentOverview[]> {
  const [documents, counts] = await Promise.all([
    prisma.legalDocument.findMany({ select: { kind: true, updatedAt: true } }),
    prisma.legalSection.groupBy({ by: ["documentKind", "isVisible"], _count: { _all: true } }),
  ])

  const updated = new Map(documents.map((document) => [document.kind, document.updatedAt]))

  return (Object.keys(DEFAULT_LEGAL_DOCUMENTS) as LegalDocumentKind[]).map((kind) => {
    if (!updated.has(kind)) {
      const sections = DEFAULT_LEGAL_DOCUMENTS[kind].sections
      return {
        kind,
        updatedAt: null,
        sectionCount: sections.length,
        hiddenCount: sections.filter((section) => section.isVisible === false).length,
      }
    }

    const rows = counts.filter((row) => row.documentKind === kind)
    const total = rows.reduce((sum, row) => sum + row._count._all, 0)
    const hidden = rows.find((row) => !row.isVisible)?._count._all ?? 0

    return { kind, updatedAt: updated.get(kind) ?? null, sectionCount: total, hiddenCount: hidden }
  })
}
