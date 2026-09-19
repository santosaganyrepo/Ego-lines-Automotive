"use server"

import { revalidatePath, updateTag } from "next/cache"

import type { Prisma } from "@/generated/prisma/client"
import type { LegalDocumentKind } from "@/generated/prisma/enums"
import { recordAuditLog } from "@/lib/audit"
import { authorizePermission } from "@/lib/auth/admin-guard"
import { adminPath } from "@/lib/constants/admin-routes"
import { LEGAL_LIMITS, legalDocumentMeta } from "@/lib/legal/legal-documents"
import { prisma } from "@/lib/prisma"
import { LEGAL_DOCUMENTS_CACHE_TAG, ensureLegalDocument } from "@/lib/queries/legal.queries"
import {
  legalDocumentRefSchema,
  legalDocumentUpdateSchema,
  legalSectionMoveSchema,
  legalSectionRefSchema,
  legalSectionUpdateSchema,
  legalSectionVisibilitySchema,
} from "@/lib/validations/legal.schema"

/**
 * Settings → Legal documents.
 *
 * Every export is a public POST endpoint, so each one validates its input,
 * checks `settings:write`, and only then writes — and records who changed the
 * published wording, in the same transaction as the change.
 *
 * Text is saved as the operator types (the editor debounces and sends one
 * save at a time), so the text actions are cheap and idempotent: an unchanged
 * value writes nothing. Structural changes — publish, hide, move, add,
 * delete — lock the document row so two of them cannot interleave.
 */

export type LegalActionResult<T = object> =
  | ({ ok: true; savedAt: string } & T)
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }

/** How long one editing session of a section is, for the audit log. */
const EDIT_SESSION_MS = 30 * 60 * 1000

function invalid(error: { issues: { path: PropertyKey[]; message: string }[] }): LegalActionResult<never> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form")
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return { ok: false, message: error.issues[0]?.message ?? "That change could not be saved.", fieldErrors }
}

const FAILED: LegalActionResult<never> = {
  ok: false,
  message: "Could not save. Check your connection — your text is kept here and will be saved when you try again.",
}
const MISSING: LegalActionResult<never> = {
  ok: false,
  message: "That section no longer exists. Reload the page to see the current document.",
}

/** The public pages read through this tag; the dashboard pages are re-rendered by path. */
function publish(structural: boolean) {
  updateTag(LEGAL_DOCUMENTS_CACHE_TAG)
  if (structural) revalidatePath(adminPath("/settings/legal"), "layout")
}

/** Serialises structural changes to one document. */
async function lockDocument(tx: Prisma.TransactionClient, kind: LegalDocumentKind) {
  await tx.$queryRaw`SELECT kind FROM "LegalDocument" WHERE kind = ${kind}::"LegalDocumentKind" FOR UPDATE`
}

/** Renumbers a document's sections 0…n-1 in their current order, so moves never meet a gap or a tie. */
async function renumber(tx: Prisma.TransactionClient, kind: LegalDocumentKind) {
  const sections = await tx.legalSection.findMany({
    where: { documentKind: kind },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, displayOrder: true },
  })

  for (const [index, section] of sections.entries()) {
    if (section.displayOrder !== index) {
      await tx.legalSection.update({ where: { id: section.id }, data: { displayOrder: index } })
    }
  }
}

async function touchDocument(tx: Prisma.TransactionClient, kind: LegalDocumentKind, at: Date) {
  await tx.legalDocument.update({ where: { kind }, data: { updatedAt: at } })
}

/* ── Title and introduction ────────────────────────────────────────── */

export async function updateLegalDocumentAction(input: unknown): Promise<LegalActionResult> {
  const parsed = legalDocumentUpdateSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  const auth = await authorizePermission("settings:write")
  if (!auth.ok) return { ok: false, message: auth.message }

  const { kind, title, summary } = parsed.data

  try {
    await ensureLegalDocument(kind)
    const savedAt = new Date()

    await prisma.$transaction(async (tx) => {
      const previous = await tx.legalDocument.findUniqueOrThrow({ where: { kind }, select: { title: true, summary: true } })
      if (previous.title === title && previous.summary === summary) return

      await tx.legalDocument.update({ where: { kind }, data: { title, summary, updatedAt: savedAt } })

      const recent = await tx.auditLog.findFirst({
        where: {
          action: "LEGAL_DOCUMENT_UPDATED",
          entityType: "LegalDocument",
          entityId: kind,
          actorId: auth.admin.id,
          createdAt: { gte: new Date(savedAt.getTime() - EDIT_SESSION_MS) },
        },
        select: { id: true },
      })

      if (!recent) {
        await recordAuditLog(
          {
            actorId: auth.admin.id,
            action: "LEGAL_DOCUMENT_UPDATED",
            entityType: "LegalDocument",
            entityId: kind,
            metadata: { document: legalDocumentMeta(kind).label, previousTitle: previous.title, previousSummary: previous.summary },
          },
          tx
        )
      }
    })

    publish(false)
    return { ok: true, savedAt: savedAt.toISOString() }
  } catch (error) {
    console.error("[legal] failed to save a document's title or introduction", error)
    return FAILED
  }
}

/* ── Section text ──────────────────────────────────────────────────── */

export async function updateLegalSectionAction(input: unknown): Promise<LegalActionResult> {
  const parsed = legalSectionUpdateSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  const auth = await authorizePermission("settings:write")
  if (!auth.ok) return { ok: false, message: auth.message }

  const { sectionId, heading, body } = parsed.data

  try {
    const savedAt = new Date()

    const found = await prisma.$transaction(async (tx) => {
      const previous = await tx.legalSection.findUnique({
        where: { id: sectionId },
        select: { documentKind: true, heading: true, body: true },
      })
      if (!previous) return false
      if (previous.heading === heading && previous.body === body) return true

      await tx.legalSection.update({
        where: { id: sectionId },
        data: { heading, body, updatedByAdminId: auth.admin.id },
      })
      await touchDocument(tx, previous.documentKind, savedAt)

      // One entry per editing session, holding the wording as it stood before
      // the session began — not one per autosave.
      const recent = await tx.auditLog.findFirst({
        where: {
          action: "LEGAL_SECTION_UPDATED",
          entityType: "LegalSection",
          entityId: sectionId,
          actorId: auth.admin.id,
          createdAt: { gte: new Date(savedAt.getTime() - EDIT_SESSION_MS) },
        },
        select: { id: true },
      })

      if (!recent) {
        await recordAuditLog(
          {
            actorId: auth.admin.id,
            action: "LEGAL_SECTION_UPDATED",
            entityType: "LegalSection",
            entityId: sectionId,
            metadata: {
              document: legalDocumentMeta(previous.documentKind).label,
              previousHeading: previous.heading,
              previousBody: previous.body,
            },
          },
          tx
        )
      }

      return true
    })

    if (!found) return MISSING

    publish(false)
    return { ok: true, savedAt: savedAt.toISOString() }
  } catch (error) {
    console.error("[legal] failed to save a section", error)
    return FAILED
  }
}

/* ── Publish or hide ───────────────────────────────────────────────── */

export async function setLegalSectionVisibilityAction(input: unknown): Promise<LegalActionResult> {
  const parsed = legalSectionVisibilitySchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  const auth = await authorizePermission("settings:write")
  if (!auth.ok) return { ok: false, message: auth.message }

  const { sectionId, isVisible } = parsed.data

  try {
    const savedAt = new Date()

    const found = await prisma.$transaction(async (tx) => {
      const section = await tx.legalSection.findUnique({
        where: { id: sectionId },
        select: { documentKind: true, heading: true, isVisible: true },
      })
      if (!section) return false
      if (section.isVisible === isVisible) return true

      await tx.legalSection.update({ where: { id: sectionId }, data: { isVisible, updatedByAdminId: auth.admin.id } })
      await touchDocument(tx, section.documentKind, savedAt)
      await recordAuditLog(
        {
          actorId: auth.admin.id,
          action: isVisible ? "LEGAL_SECTION_SHOWN" : "LEGAL_SECTION_HIDDEN",
          entityType: "LegalSection",
          entityId: sectionId,
          metadata: { document: legalDocumentMeta(section.documentKind).label, heading: section.heading },
        },
        tx
      )
      return true
    })

    if (!found) return MISSING

    publish(true)
    return { ok: true, savedAt: savedAt.toISOString() }
  } catch (error) {
    console.error("[legal] failed to change a section's visibility", error)
    return FAILED
  }
}

/* ── Order ─────────────────────────────────────────────────────────── */

export async function moveLegalSectionAction(input: unknown): Promise<LegalActionResult> {
  const parsed = legalSectionMoveSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  const auth = await authorizePermission("settings:write")
  if (!auth.ok) return { ok: false, message: auth.message }

  const { sectionId, direction } = parsed.data

  try {
    const savedAt = new Date()

    const found = await prisma.$transaction(async (tx) => {
      const section = await tx.legalSection.findUnique({
        where: { id: sectionId },
        select: { documentKind: true, heading: true },
      })
      if (!section) return false

      await lockDocument(tx, section.documentKind)
      await renumber(tx, section.documentKind)

      const ordered = await tx.legalSection.findMany({
        where: { documentKind: section.documentKind },
        orderBy: { displayOrder: "asc" },
        select: { id: true, displayOrder: true },
      })
      const index = ordered.findIndex((row) => row.id === sectionId)
      const neighbour = ordered[direction === "up" ? index - 1 : index + 1]
      if (!neighbour) return true // already first or last

      await tx.legalSection.update({ where: { id: sectionId }, data: { displayOrder: neighbour.displayOrder } })
      await tx.legalSection.update({ where: { id: neighbour.id }, data: { displayOrder: ordered[index].displayOrder } })
      await touchDocument(tx, section.documentKind, savedAt)
      await recordAuditLog(
        {
          actorId: auth.admin.id,
          action: "LEGAL_SECTION_MOVED",
          entityType: "LegalSection",
          entityId: sectionId,
          metadata: {
            document: legalDocumentMeta(section.documentKind).label,
            heading: section.heading,
            from: index + 1,
            to: direction === "up" ? index : index + 2,
          },
        },
        tx
      )
      return true
    })

    if (!found) return MISSING

    publish(true)
    return { ok: true, savedAt: savedAt.toISOString() }
  } catch (error) {
    console.error("[legal] failed to move a section", error)
    return FAILED
  }
}

/* ── Add and delete ────────────────────────────────────────────────── */

/**
 * Adds an empty section at the end. It starts hidden: a new section is
 * published when its author switches it on, never while it is still blank.
 */
export async function addLegalSectionAction(input: unknown): Promise<LegalActionResult<{ sectionId: string }>> {
  const parsed = legalDocumentRefSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  const auth = await authorizePermission("settings:write")
  if (!auth.ok) return { ok: false, message: auth.message }

  const { kind } = parsed.data

  try {
    await ensureLegalDocument(kind)
    const savedAt = new Date()

    const created = await prisma.$transaction(async (tx) => {
      await lockDocument(tx, kind)

      const count = await tx.legalSection.count({ where: { documentKind: kind } })
      if (count >= LEGAL_LIMITS.sectionsMax) return null

      const section = await tx.legalSection.create({
        data: {
          documentKind: kind,
          heading: "New section",
          body: "",
          isVisible: false,
          displayOrder: count,
          updatedByAdminId: auth.admin.id,
        },
        select: { id: true },
      })
      await touchDocument(tx, kind, savedAt)
      await recordAuditLog(
        {
          actorId: auth.admin.id,
          action: "LEGAL_SECTION_ADDED",
          entityType: "LegalSection",
          entityId: section.id,
          metadata: { document: legalDocumentMeta(kind).label },
        },
        tx
      )
      return section
    })

    if (!created) {
      return { ok: false, message: `A document can have at most ${LEGAL_LIMITS.sectionsMax} sections.` }
    }

    publish(true)
    return { ok: true, savedAt: savedAt.toISOString(), sectionId: created.id }
  } catch (error) {
    console.error("[legal] failed to add a section", error)
    return FAILED
  }
}

/**
 * Deletes a section. Its wording is copied into the audit log first, so a
 * clause deleted by mistake can be read back and restored by hand.
 */
export async function deleteLegalSectionAction(input: unknown): Promise<LegalActionResult> {
  const parsed = legalSectionRefSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  const auth = await authorizePermission("settings:write")
  if (!auth.ok) return { ok: false, message: auth.message }

  const { sectionId } = parsed.data

  try {
    const savedAt = new Date()

    const found = await prisma.$transaction(async (tx) => {
      const section = await tx.legalSection.findUnique({
        where: { id: sectionId },
        select: { documentKind: true, heading: true, body: true, isVisible: true },
      })
      if (!section) return false

      await lockDocument(tx, section.documentKind)
      await recordAuditLog(
        {
          actorId: auth.admin.id,
          action: "LEGAL_SECTION_REMOVED",
          entityType: "LegalSection",
          entityId: sectionId,
          metadata: {
            document: legalDocumentMeta(section.documentKind).label,
            heading: section.heading,
            body: section.body,
            wasPublished: section.isVisible,
          },
        },
        tx
      )
      await tx.legalSection.delete({ where: { id: sectionId } })
      await renumber(tx, section.documentKind)
      await touchDocument(tx, section.documentKind, savedAt)
      return true
    })

    if (!found) return MISSING

    publish(true)
    return { ok: true, savedAt: savedAt.toISOString() }
  } catch (error) {
    console.error("[legal] failed to delete a section", error)
    return FAILED
  }
}
