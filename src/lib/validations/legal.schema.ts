import { z } from "zod"

import { LegalDocumentKind } from "@/generated/prisma/enums"
import { LEGAL_LIMITS } from "@/lib/legal/legal-documents"

/**
 * Input for Settings → Legal documents. Every action there is a public POST
 * endpoint, so each shape is exact: unknown keys are dropped, every string is
 * bounded (matching the database CHECKs in the legal_documents migration), and
 * ids are checked for shape before they reach a query.
 *
 * Text is stored as typed — it is plain text, never HTML, and React escapes it
 * when the page renders (see legal-text.ts) — so nothing is stripped here
 * beyond line-ending normalisation and trimming.
 */

const kind = z.enum(LegalDocumentKind)

const sectionId = z.string().trim().min(1).max(64).regex(/^[a-z0-9]+$/i, "That section could not be found.")

/** Line endings normalised so a Windows browser and a phone save the same text. */
const multiline = (max: number, label: string) =>
  z
    .string()
    .transform((value) => value.replace(/\r\n?/g, "\n").trim())
    .pipe(z.string().max(max, `${label} can be at most ${max.toLocaleString("en-GB")} characters.`))

export const legalDocumentUpdateSchema = z.object({
  kind,
  title: z
    .string()
    .trim()
    .min(1, "Give the document a title.")
    .max(LEGAL_LIMITS.titleMax, `Keep the title under ${LEGAL_LIMITS.titleMax} characters.`),
  summary: multiline(LEGAL_LIMITS.summaryMax, "The introduction"),
})

export const legalSectionUpdateSchema = z.object({
  sectionId,
  heading: z
    .string()
    .trim()
    .min(1, "Give the section a heading.")
    .max(LEGAL_LIMITS.headingMax, `Keep the heading under ${LEGAL_LIMITS.headingMax} characters.`),
  body: multiline(LEGAL_LIMITS.bodyMax, "A section"),
})

export const legalSectionVisibilitySchema = z.object({
  sectionId,
  isVisible: z.boolean(),
})

export const legalSectionMoveSchema = z.object({
  sectionId,
  direction: z.enum(["up", "down"]),
})

export const legalSectionRefSchema = z.object({ sectionId })

export const legalDocumentRefSchema = z.object({ kind })

export type LegalDocumentUpdateInput = z.infer<typeof legalDocumentUpdateSchema>
export type LegalSectionUpdateInput = z.infer<typeof legalSectionUpdateSchema>
