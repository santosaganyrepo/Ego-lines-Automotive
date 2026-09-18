-- An optional discount on a quotation, frozen onto the order at conversion.
-- Additive only: every existing quote has no discount, every existing order a
-- discount of zero, so no stored total changes.

-- CreateEnum
CREATE TYPE "QuoteDiscountType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountLabel" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "discountLabel" TEXT,
ADD COLUMN     "discountType" "QuoteDiscountType",
ADD COLUMN     "discountValue" DECIMAL(12,2);

-- Type and value are set together or not at all; the value is never negative,
-- and a percentage never exceeds 100.
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_discount_check" CHECK (
  ("discountType" IS NULL AND "discountValue" IS NULL)
  OR (
    "discountType" IS NOT NULL
    AND "discountValue" IS NOT NULL
    AND "discountValue" >= 0
    AND ("discountType" <> 'PERCENTAGE' OR "discountValue" <= 100)
  )
);

ALTER TABLE "Order" ADD CONSTRAINT "Order_discount_non_negative_check" CHECK ("discountAmount" >= 0);
