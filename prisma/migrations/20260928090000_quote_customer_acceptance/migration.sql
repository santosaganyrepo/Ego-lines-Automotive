-- The customer's own "Accept quotation" button (/quotation/<token>/accept).
-- Additive: three nullable columns and an index. No existing row changes.

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "customerAcceptanceNote" TEXT,
ADD COLUMN     "customerAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "customerAcceptedTotal" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "Quote_customerAcceptedAt_idx" ON "Quote"("customerAcceptedAt");

-- An acceptance is a moment and a figure together: a timestamp without the
-- total the customer agreed to (or the reverse) is not an acceptance anyone
-- can act on, and a note belongs to an acceptance.
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customer_acceptance_check" CHECK (
  ("customerAcceptedAt" IS NULL AND "customerAcceptedTotal" IS NULL AND "customerAcceptanceNote" IS NULL)
  OR ("customerAcceptedAt" IS NOT NULL AND "customerAcceptedTotal" IS NOT NULL AND "customerAcceptedTotal" >= 0)
);
