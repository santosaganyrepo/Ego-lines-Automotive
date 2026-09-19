import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, FileText } from "lucide-react"

import { SettingsPanel } from "@/components/admin/settings/settings-ui"
import { requirePermission } from "@/lib/auth/admin-guard"
import { LEGAL_SETTINGS_PATH, SETTINGS_BASE_PATH } from "@/lib/constants/settings-nav"
import { LEGAL_DOCUMENTS } from "@/lib/legal/legal-documents"
import { listLegalDocumentsForAdmin } from "@/lib/queries/legal.queries"

export const metadata: Metadata = {
  title: "Legal documents · Settings",
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date)
}

/**
 * Settings → Legal documents: the four documents the website publishes, each
 * with its state at a glance. Every document is edited on its own page.
 */
export default async function LegalDocumentsSettingsPage() {
  await requirePermission("settings:read")
  const overview = await listLegalDocumentsForAdmin()

  return (
    <>
      <SettingsPanel
        id="legal-documents"
        title="Legal documents"
        description="The terms and policies published on the website, linked from every page's footer. Each one is written for this business and can be changed here at any time — edits are live as soon as they save."
      >
        <ul className="flex flex-col divide-y divide-border">
          {LEGAL_DOCUMENTS.map((document) => {
            const state = overview.find((row) => row.kind === document.kind)
            const shown = state ? state.sectionCount - state.hiddenCount : 0

            return (
              <li key={document.kind}>
                <Link
                  href={`${LEGAL_SETTINGS_PATH}/${document.slug}`}
                  className="group/doc -mx-2 flex items-start gap-4 rounded-lg px-2 py-4 transition-colors duration-fast hover:bg-muted/60"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold-ink">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-small font-semibold">{document.label}</span>
                    <span className="text-small text-muted-foreground">{document.purpose}</span>
                    <span className="text-xs text-muted-foreground">
                      {shown} of {state?.sectionCount ?? 0} sections shown
                      {" · "}
                      {state?.updatedAt ? `Last edited ${formatDate(state.updatedAt)}` : "Original wording, not yet edited"}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform duration-fast group-hover/doc:translate-x-0.5"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </SettingsPanel>

      <SettingsPanel
        id="legal-advice"
        title="Before you rely on them"
        description="The documents are a professionally structured starting point written for how this business works — importing from Japan, South Korea and China through Mombasa, staged payments and manual payment verification. They are not legal advice. Have them reviewed by a lawyer qualified in South Sudan, and fill in the official payment accounts on the Payment Safety page (the “Account details” section is hidden until you do)."
      >
        <p className="text-small text-muted-foreground">
          The registered company name, registration number and tax number shown on every document are set under{" "}
          <Link href={`${SETTINGS_BASE_PATH}#company-registration`} className="font-medium text-foreground underline underline-offset-2 hover:text-gold-ink">
            Business information → Registered company
          </Link>
          .
        </p>
      </SettingsPanel>
    </>
  )
}
