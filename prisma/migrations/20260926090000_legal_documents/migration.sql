-- Legal documents (Terms of Sale, Terms of Use, Privacy Policy, Payment
-- Safety) edited in Settings → Legal documents, and the registered company
-- details shown beside them. Additive: two new tables, one enum, three
-- columns with empty defaults. No existing row changes.
-- CreateEnum
CREATE TYPE "LegalDocumentKind" AS ENUM ('TERMS_OF_SALE', 'TERMS_OF_USE', 'PRIVACY_POLICY', 'PAYMENT_SAFETY');

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "legalName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "registrationNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "taxNumber" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "LegalDocument" (
    "kind" "LegalDocumentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("kind")
);

-- CreateTable
CREATE TABLE "LegalSection" (
    "id" TEXT NOT NULL,
    "documentKind" "LegalDocumentKind" NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalSection_documentKind_displayOrder_idx" ON "LegalSection"("documentKind", "displayOrder");

-- AddForeignKey
ALTER TABLE "LegalSection" ADD CONSTRAINT "LegalSection_documentKind_fkey" FOREIGN KEY ("documentKind") REFERENCES "LegalDocument"("kind") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalSection" ADD CONSTRAINT "LegalSection_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Length ceilings, matching the Zod schemas in legal.schema.ts and
-- settings.schema.ts. The schemas give the operator a readable message; these
-- are the backstop that keeps a crafted request from storing a megabyte.
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_length_check"
  CHECK (char_length("title") BETWEEN 1 AND 120 AND char_length("summary") <= 3000);
ALTER TABLE "LegalSection" ADD CONSTRAINT "LegalSection_length_check"
  CHECK (char_length("heading") BETWEEN 1 AND 160 AND char_length("body") <= 20000);
ALTER TABLE "BusinessSettings" ADD CONSTRAINT "BusinessSettings_company_details_length_check"
  CHECK (char_length("legalName") <= 160 AND char_length("registrationNumber") <= 80 AND char_length("taxNumber") <= 80);

-- Same lock as every other table (migration 20260925090000): the browser's
-- publishable key must not reach these through Supabase's REST API.
ALTER TABLE "LegalDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LegalSection" ENABLE ROW LEVEL SECURITY;
