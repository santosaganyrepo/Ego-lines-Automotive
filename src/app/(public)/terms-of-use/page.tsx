import type { Metadata } from "next"

import { LegalDocumentPage, legalDocumentMetadata } from "@/components/legal/legal-document-page"
import { LegalDocumentKind } from "@/generated/prisma/enums"

/** Written and published in Settings → Legal documents. */
export function generateMetadata(): Promise<Metadata> {
  return legalDocumentMetadata(LegalDocumentKind.TERMS_OF_USE)
}

export default function Page() {
  return <LegalDocumentPage kind={LegalDocumentKind.TERMS_OF_USE} />
}
