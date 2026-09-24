import { describe, expect, it } from "vitest"

import { QuoteStatus, QuoteType } from "@/generated/prisma/enums"
import { quoteEmailHtml } from "@/lib/email/quote-email-html"
import { buildQuotePdfData, type QuotePdfSource } from "@/lib/pdf/quote-pdf-data"
import {
  quoteAcceptanceFingerprint,
  quoteAcceptanceState,
  quoteAcceptanceUrl,
} from "@/lib/quotes/quote-acceptance"
import { buildQuoteMessage, type QuoteMessageInput } from "@/lib/quotes/quote-messages"

/**
 * The customer's "Accept quotation" (src/lib/quotes/quote-acceptance.ts):
 * when it is open, that it accepts only the figures the customer saw, and
 * that every channel offers it without taking away the plain reply.
 */

const NOW = new Date("2026-09-20T12:00:00Z")
const IN_DATE = new Date("2026-09-30T00:00:00Z")
const LAPSED = new Date("2026-09-10T00:00:00Z")

describe("quoteAcceptanceState", () => {
  it("is open for a sent quotation within its validity", () => {
    expect(quoteAcceptanceState({ status: QuoteStatus.SENT, customerAcceptedAt: null, validUntil: IN_DATE, now: NOW })).toBe(
      "OPEN"
    )
  })

  it("stays open through the last valid day", () => {
    const lastDay = new Date("2026-09-20T00:00:00Z")
    expect(quoteAcceptanceState({ status: QuoteStatus.SENT, customerAcceptedAt: null, validUntil: lastDay, now: NOW })).toBe(
      "OPEN"
    )
  })

  it("is expired once the validity date has passed, even before anyone marks it", () => {
    expect(quoteAcceptanceState({ status: QuoteStatus.SENT, customerAcceptedAt: null, validUntil: LAPSED, now: NOW })).toBe(
      "EXPIRED"
    )
  })

  it("tells a customer's own acceptance from one an operator recorded", () => {
    expect(quoteAcceptanceState({ status: QuoteStatus.ACCEPTED, customerAcceptedAt: NOW, validUntil: IN_DATE })).toBe(
      "ACCEPTED_BY_CUSTOMER"
    )
    expect(quoteAcceptanceState({ status: QuoteStatus.ACCEPTED, customerAcceptedAt: null, validUntil: IN_DATE })).toBe(
      "ACCEPTED"
    )
  })

  it.each([QuoteStatus.NEW, QuoteStatus.CONTACTED, QuoteStatus.REJECTED])("is closed while the quote is %s", (status) => {
    expect(quoteAcceptanceState({ status, customerAcceptedAt: null, validUntil: IN_DATE, now: NOW })).toBe("CLOSED")
  })

  it("reports a converted quote as ordered", () => {
    expect(quoteAcceptanceState({ status: QuoteStatus.WON, customerAcceptedAt: NOW, validUntil: IN_DATE })).toBe("ORDERED")
  })
})

const SOURCE: QuotePdfSource = {
  quoteNumber: "CLM-Q-2026-000045",
  type: QuoteType.VEHICLE,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  validUntil: IN_DATE,
  shippingCost: 2_000,
  clearingCost: 800,
  importDuty: null,
  otherCostsLabel: null,
  otherCostsAmount: null,
  discountType: null,
  discountValue: null,
  discountLabel: null,
  paymentInstructions: "Bank transfer",
  terms: null,
  contactName: "Test Customer",
  contactCity: "Juba",
  contactPhone: null,
  contactEmail: null,
  items: [{ kind: "ITEM", description: "2021 Toyota Harrier", quantity: 1, quotedUnitPrice: 20_000 }],
}

describe("quoteAcceptanceFingerprint", () => {
  const fingerprint = (source: QuotePdfSource) => quoteAcceptanceFingerprint(buildQuotePdfData(source, "Any name"))

  it("is stable for the same figures", () => {
    expect(fingerprint(SOURCE)).toBe(fingerprint({ ...SOURCE }))
    expect(fingerprint(SOURCE)).toMatch(/^[a-f0-9]{64}$/)
  })

  it("does not depend on the business name printed on the document", () => {
    expect(quoteAcceptanceFingerprint(buildQuotePdfData(SOURCE, "A"))).toBe(
      quoteAcceptanceFingerprint(buildQuotePdfData(SOURCE, "B"))
    )
  })

  it.each<[string, Partial<QuotePdfSource>]>([
    ["a line price", { items: [{ kind: "ITEM", description: "2021 Toyota Harrier", quantity: 1, quotedUnitPrice: 21_000 }] }],
    ["a fee", { shippingCost: 2_500 }],
    ["the validity date", { validUntil: new Date("2026-10-15T00:00:00Z") }],
    ["the payment instructions", { paymentInstructions: "Mobile money" }],
    ["the terms", { terms: "Deposit is non-refundable." }],
  ])("changes when %s changes", (_label, change) => {
    expect(fingerprint({ ...SOURCE, ...change })).not.toBe(fingerprint(SOURCE))
  })
})

describe("the Accept link in the quotation message", () => {
  const input: QuoteMessageInput = {
    siteName: "Crownline Motors",
    customerName: "Test Customer",
    quoteNumber: "CLM-Q-2026-000045",
    note: "Here is your quotation.",
    items: [{ description: "2021 Toyota Harrier", quantity: 1, lineTotal: 20_000 }],
    itemsSubtotal: 20_000,
    accessoriesTotal: 0,
    shippingCost: null,
    clearingCost: null,
    importDuty: null,
    otherCostsLabel: null,
    otherCostsAmount: null,
    discount: null,
    total: 20_000,
    validUntil: IN_DATE,
    link: "https://example.com/quotation/token",
    paymentInstructions: null,
    isVehicle: true,
  }
  const acceptUrl = quoteAcceptanceUrl("https://example.com/", "a".repeat(43))

  it("builds the page address on the site origin", () => {
    expect(acceptUrl).toBe(`https://example.com/quotation/${"a".repeat(43)}/accept`)
  })

  it("offers accepting online and still invites a plain reply", () => {
    const body = buildQuoteMessage({ ...input, acceptUrl }, "WHATSAPP").body
    expect(body).toContain(acceptUrl)
    expect(body).toContain("*Ready to go ahead?*")
    expect(body).toContain("Or simply reply to this message")
  })

  it("falls back to replying when there is no link", () => {
    const body = buildQuoteMessage({ ...input, link: null, acceptUrl: null }, "EMAIL").body
    expect(body).toContain("To accept, simply reply to this message.")
    expect(body).not.toContain("/accept")
  })

  it("renders Accept and View as buttons in the email, escaping the message text", () => {
    const html = quoteEmailHtml("Hello <b>there</b>", { acceptUrl, pdfUrl: input.link })
    expect(html).toContain(`href="${acceptUrl}"`)
    expect(html).toContain("Accept quotation")
    expect(html).toContain("View quotation (PDF)")
    expect(html).toContain("Hello &lt;b&gt;there&lt;/b&gt;")
    expect(html).toContain("reply to this email")
  })

  it("never renders a non-http link as a button", () => {
    const html = quoteEmailHtml("Hello", { acceptUrl: "javascript:alert(1)", pdfUrl: null })
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("Accept quotation")
  })
})
