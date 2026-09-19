import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { LegalDocumentEditor } from "@/components/admin/legal/legal-document-editor"
import { requirePermission } from "@/lib/auth/admin-guard"
import { can } from "@/lib/auth/permissions"
import { legalDocumentBySlug } from "@/lib/legal/legal-documents"
import { legalPlaceholderValues } from "@/lib/legal/placeholder-values"
import { getLegalDocumentForAdmin } from "@/lib/queries/legal.queries"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"

export async function generateMetadata(props: PageProps<"/Ricky@2000/settings/legal/[document]">): Promise<Metadata> {
  const { document } = await props.params
  const meta = legalDocumentBySlug(document)
  return { title: meta ? `${meta.label} · Legal documents` : "Legal documents" }
}

/**
 * Settings → Legal documents → one document.
 *
 * Opening a document for the first time copies the wording the site shipped
 * with into the database, so there is something to edit. That is a write, so
 * it happens only for an administrator who may edit settings.
 */
export default async function LegalDocumentSettingsPage(props: PageProps<"/Ricky@2000/settings/legal/[document]">) {
  const admin = await requirePermission("settings:read")
  const canEdit = can(admin.role, "settings:write")

  const { document: slug } = await props.params
  const meta = legalDocumentBySlug(slug)
  if (!meta) notFound()

  if (!canEdit) {
    // Read-only viewers never trigger the first-open copy.
    await requirePermission("settings:write")
  }

  const [document, settings] = await Promise.all([getLegalDocumentForAdmin(meta.kind), getPublicSiteSettings()])

  return (
    <LegalDocumentEditor
      document={document}
      meta={meta}
      values={legalPlaceholderValues(settings)}
      canEdit={canEdit}
    />
  )
}
