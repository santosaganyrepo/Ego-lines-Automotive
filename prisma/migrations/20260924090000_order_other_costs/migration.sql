-- The quotation's "other costs" fee was counted in Order.totalAmount at
-- conversion but not recorded on the order itself, so an order's cost lines
-- did not add up to its total. Additive: two nullable columns, backfilled from
-- each order's own quotation (frozen once converted), which is exactly the
-- figure its total already includes.
ALTER TABLE "Order" ADD COLUMN "otherCostsLabel" TEXT,
ADD COLUMN "otherCostsAmount" DECIMAL(12,2);

UPDATE "Order" AS o
SET "otherCostsLabel" = q."otherCostsLabel",
    "otherCostsAmount" = q."otherCostsAmount"
FROM "Quote" AS q
WHERE o."quoteId" = q.id
  AND q."otherCostsAmount" IS NOT NULL;

ALTER TABLE "Order" ADD CONSTRAINT "Order_other_costs_non_negative_check"
  CHECK ("otherCostsAmount" IS NULL OR "otherCostsAmount" >= 0);
