import { createHash } from "node:crypto"

import { QuoteStatus } from "@/generated/prisma/enums"
import type { QuotePdfData } from "@/lib/pdf/quote-pdf-data"
import { isPastValidity } from "@/lib/quotes/quote-pricing"

/**
 * The customer's "Accept quotation": what it may accept, and when.
 *
 * ── What "accept" means here ──────────────────────────────────────────────
 * The customer saying yes, in writing, to the figures in front of them —
 * nothing more. It moves the quote to ACCEPTED ("ready to become an order")
 * and tells the dealership at once. It deliberately does *not* create the
 * order: conversion reserves the vehicle or the stock and fixes the payment
 * schedule, and that stays an operator's step, taken with the acceptance in
 * front of them. The customer is never forced through this button either;
 * replying on WhatsApp or by email works exactly as before.
 *
 * ── Accepting exactly what was shown ─────────────────────────────────────
 * A quote in SENT can still be revised. If an operator changes a price while
 * the customer has the page open, pressing Accept must not agree to figures
 * the customer never saw. So the page carries a fingerprint of everything
 * the quotation document shows (`quoteAcceptanceFingerprint`), and the
 * action refuses when the stored quote no longer produces the same one.
 *
 * Pure, apart from the hash: every rule is unit-tested
 * (tests/unit/quote-acceptance.test.ts).
 */

export type QuoteAcceptanceState =
  /** Open for the customer's answer. */
  | "OPEN"
  /** The customer pressed Accept (the page shows when, and the total). */
  | "ACCEPTED_BY_CUSTOMER"
  /** An operator recorded the acceptance on the customer's word. */
  | "ACCEPTED"
  /** Converted: the order exists. */
  | "ORDERED"
  /** The validity date has passed. */
  | "EXPIRED"
  /** Lost, lapsed, or reopened for work: nothing to accept right now. */
  | "CLOSED"

export function quoteAcceptanceState(input: {
  status: QuoteStatus
  customerAcceptedAt: Date | null
  validUntil: Date | null
  now?: Date
}): QuoteAcceptanceState {
  switch (input.status) {
    case QuoteStatus.WON:
      return "ORDERED"
    case QuoteStatus.ACCEPTED:
      return input.customerAcceptedAt ? "ACCEPTED_BY_CUSTOMER" : "ACCEPTED"
    case QuoteStatus.SENT:
      // A quotation without a validity date cannot be sent (see
      // quoteReadinessProblem), so a missing one is treated as not open.
      if (!input.validUntil || isPastValidity(input.validUntil, input.now)) return "EXPIRED"
      return "OPEN"
    case QuoteStatus.EXPIRED:
      return "EXPIRED"
    default:
      return "CLOSED"
  }
}

/**
 * A digest of every figure and term the customer's document shows. Two
 * renderings with the same fingerprint say the same thing; any change to a
 * line, a fee, the discount, the total, the validity date, the payment
 * instructions or the terms changes it.
 */
export function quoteAcceptanceFingerprint(data: QuotePdfData): string {
  const shown = {
    quoteNumber: data.quoteNumber,
    validUntil: data.validUntil?.toISOString() ?? null,
    lines: data.lines.map((line) => [line.kind, line.description, line.quantity, line.unitPrice]),
    shippingCost: data.shippingCost,
    clearingCost: data.clearingCost,
    importDuty: data.importDuty,
    otherCosts: [data.otherCostsLabel, data.otherCostsAmount],
    discount: data.discount,
    total: data.total,
    paymentInstructions: data.paymentInstructions,
    terms: data.terms,
  }
  return createHash("sha256").update(JSON.stringify(shown)).digest("hex")
}

/** The Accept page for a quotation link. */
export function quoteAcceptancePath(shareToken: string): string {
  return `/quotation/${shareToken}/accept`
}

export function quoteAcceptanceUrl(origin: string, shareToken: string): string {
  return `${origin.replace(/\/+$/, "")}${quoteAcceptancePath(shareToken)}`
}

/** The optional message a customer may send with their acceptance. */
export const ACCEPTANCE_NOTE_MAX_LENGTH = 1000

/** Share tokens are 43 base64url characters; anything else was never issued. */
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/
