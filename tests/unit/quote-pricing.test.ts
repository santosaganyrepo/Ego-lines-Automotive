import { describe, expect, it } from "vitest"

import { QuoteType } from "@/generated/prisma/enums"
import { buildQuotePdfData, type QuotePdfSource } from "@/lib/pdf/quote-pdf-data"
import { buildQuoteMessage, type QuoteMessageInput } from "@/lib/quotes/quote-messages"
import {
  computeQuoteTotals,
  discountCents,
  discountLineLabel,
  quoteReadinessProblem,
  toQuoteDiscount,
  type PricedQuoteLine,
  type QuoteFees,
} from "@/lib/quotes/quote-pricing"

const CAR: PricedQuoteLine = { kind: "ITEM", quantity: 1, unitPrice: 20_000 }
const MATS: PricedQuoteLine = { kind: "ACCESSORY", quantity: 2, unitPrice: 50 }
const FEES: QuoteFees = { shippingCost: 2_000, clearingCost: 1_000, importDuty: 500, otherCosts: 750 }
const NO_FEES: QuoteFees = { shippingCost: null, clearingCost: null, importDuty: null, otherCosts: null }

describe("computeQuoteTotals", () => {
  it("adds goods and fees when there is no discount", () => {
    const totals = computeQuoteTotals([CAR, MATS], FEES, null)

    expect(totals.itemsSubtotal).toBe(20_000)
    expect(totals.accessoriesTotal).toBe(100)
    expect(totals.feesTotal).toBe(4_250)
    expect(totals.discountTotal).toBe(0)
    expect(totals.total).toBe(24_350)
  })

  it("takes a percentage of the goods only, never of the fees", () => {
    const totals = computeQuoteTotals([CAR, MATS], FEES, { type: "PERCENTAGE", value: 10 })

    // 10% of 20,100 — shipping, clearing, duty and other costs untouched.
    expect(totals.discountTotal).toBe(2_010)
    expect(totals.feesTotal).toBe(4_250)
    expect(totals.total).toBe(24_350 - 2_010)
  })

  it("takes a fixed amount off the goods", () => {
    const totals = computeQuoteTotals([CAR], FEES, { type: "FIXED_AMOUNT", value: 1_500 })

    expect(totals.discountTotal).toBe(1_500)
    expect(totals.total).toBe(20_000 - 1_500 + 4_250)
  })

  it("caps a fixed discount at the goods, so it never eats into the fees", () => {
    const totals = computeQuoteTotals([CAR], FEES, { type: "FIXED_AMOUNT", value: 50_000 })

    expect(totals.discountTotal).toBe(20_000)
    expect(totals.total).toBe(4_250)
  })

  it("rounds a fractional percentage to the nearest cent", () => {
    const totals = computeQuoteTotals([{ kind: "ITEM", quantity: 1, unitPrice: 999.99 }], NO_FEES, {
      type: "PERCENTAGE",
      value: 7.5,
    })

    // 999.99 × 7.5% = 74.99925 → 75.00
    expect(totals.discountTotal).toBe(75)
    expect(totals.total).toBe(924.99)
  })

  it("ignores unpriced lines when working out the discount", () => {
    const totals = computeQuoteTotals([CAR, { kind: "ITEM", quantity: 1, unitPrice: null }], NO_FEES, {
      type: "PERCENTAGE",
      value: 50,
    })

    expect(totals.discountTotal).toBe(10_000)
    expect(totals.unpricedLines).toBe(1)
  })
})

describe("discountCents", () => {
  it("is zero with no discount or no goods", () => {
    expect(discountCents(100_000, null)).toBe(0)
    expect(discountCents(0, { type: "PERCENTAGE", value: 10 })).toBe(0)
  })

  it("never goes negative", () => {
    expect(discountCents(100_000, { type: "FIXED_AMOUNT", value: -5 })).toBe(0)
  })
})

describe("toQuoteDiscount", () => {
  it("needs both a type and a value", () => {
    expect(toQuoteDiscount(null, 10)).toBeNull()
    expect(toQuoteDiscount("PERCENTAGE", null)).toBeNull()
    expect(toQuoteDiscount("PERCENTAGE", 10)).toEqual({ type: "PERCENTAGE", value: 10 })
  })
})

describe("discountLineLabel", () => {
  it("uses the operator's label, with the rate for a percentage", () => {
    expect(discountLineLabel({ type: "PERCENTAGE", value: 10 }, "Loyal customer")).toBe("Loyal customer (10%)")
    expect(discountLineLabel({ type: "PERCENTAGE", value: 7.5 }, null)).toBe("Discount (7.5%)")
    expect(discountLineLabel({ type: "FIXED_AMOUNT", value: 500 }, "  ")).toBe("Discount")
  })
})

describe("quoteReadinessProblem", () => {
  it("refuses a quotation a discount has reduced to nothing", () => {
    expect(
      quoteReadinessProblem({
        lines: [CAR],
        fees: NO_FEES,
        discount: { type: "PERCENTAGE", value: 100 },
        validUntil: new Date("2099-01-01"),
      })
    ).toMatch(/totals nothing/)
  })
})

const PDF_SOURCE: QuotePdfSource = {
  quoteNumber: "CLM-Q-2026-000001",
  type: QuoteType.VEHICLE,
  createdAt: new Date("2026-09-01"),
  validUntil: new Date("2026-09-30"),
  shippingCost: 2_000,
  clearingCost: null,
  importDuty: null,
  otherCostsLabel: null,
  otherCostsAmount: null,
  discountType: "PERCENTAGE",
  discountValue: 5,
  discountLabel: "Launch offer",
  paymentInstructions: null,
  terms: null,
  contactName: "Test Customer",
  contactCity: null,
  contactPhone: null,
  contactEmail: null,
  items: [{ kind: "ITEM", description: "2021 Toyota Harrier", quantity: 1, quotedUnitPrice: 20_000 }],
}

describe("the discount on the customer's quotation", () => {
  it("is printed on the PDF and taken off its total", () => {
    const data = buildQuotePdfData(PDF_SOURCE, "EGO-Lines Automotive")

    expect(data.discount).toEqual({ label: "Launch offer (5%)", amount: 1_000 })
    expect(data.total).toBe(20_000 - 1_000 + 2_000)
  })

  it("is absent from the PDF when the quote has none", () => {
    const data = buildQuotePdfData({ ...PDF_SOURCE, discountType: null, discountValue: null }, "EGO-Lines Automotive")

    expect(data.discount).toBeNull()
    expect(data.total).toBe(22_000)
  })

  it("appears in the WhatsApp message as a reduction", () => {
    const input: QuoteMessageInput = {
      siteName: "EGO-Lines Automotive",
      customerName: "Test Customer",
      quoteNumber: "CLM-Q-2026-000001",
      note: "Here is your quotation.",
      items: [{ description: "2021 Toyota Harrier", quantity: 1, lineTotal: 20_000 }],
      itemsSubtotal: 20_000,
      accessoriesTotal: 0,
      shippingCost: 2_000,
      clearingCost: null,
      importDuty: null,
      otherCostsLabel: null,
      otherCostsAmount: null,
      discount: { label: "Launch offer (5%)", amount: 1_000 },
      total: 21_000,
      validUntil: new Date("2026-09-30"),
      link: null,
      paymentInstructions: null,
      isVehicle: true,
    }

    expect(buildQuoteMessage(input, "WHATSAPP").body).toContain("Launch offer (5%): −$1,000")
  })
})
