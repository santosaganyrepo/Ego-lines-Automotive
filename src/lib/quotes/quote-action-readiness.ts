/**
 * Why the two primary quote actions — "Send quotation" and "Convert to
 * order" — cannot be used at this moment, in the order an operator would
 * actually resolve them.
 *
 * Extracted from the two dialogs so the header can show ONE explanation for
 * both buttons instead of the same sentence twice, side by side, in two
 * differently-sized blocks. The dialogs still ask these functions themselves:
 * each remains safe to drop anywhere, and the header cannot disagree with
 * the button it is describing because there is only one rule.
 *
 * Pure strings in, pure string out — no React, no context — so the unit
 * suite can exercise the precedence directly.
 */

/** Precedence note: unsaved changes are reported before readiness, because
 *  both server actions re-read the quote from the database rather than from
 *  the draft on screen. Reporting "add a price" for a price the operator can
 *  see in the field would have them "fix" it, resubmit, and meet the same
 *  message again — see the file note on `isDirty` in
 *  quote-pricing-context.tsx. */
export const QUOTE_DIRTY_SEND_REASON =
  "You have unsaved changes — save the details before sending this quotation."

export const QUOTE_DIRTY_CONVERT_REASON =
  "You have unsaved changes — save the details before converting this quote."

export interface QuoteDispatchBlockInput {
  /** Set when the quote's own status forbids sending; null when it allows it. */
  statusReason?: string | null
  isDirty: boolean
  /** From `useQuotePricing()`: what is still missing from the draft. */
  readinessProblem: string | null
}

export interface QuoteConvertBlockInput {
  /** Set when the quote's own status forbids converting; null when it allows it. */
  statusReason?: string | null
  isDirty: boolean
}

/** Why the quotation cannot be sent, or null when it can. */
export function quoteDispatchBlockReason({
  statusReason,
  isDirty,
  readinessProblem,
}: QuoteDispatchBlockInput): string | null {
  if (statusReason) return statusReason
  if (isDirty) return QUOTE_DIRTY_SEND_REASON
  return readinessProblem ?? null
}

/**
 * Why the quote cannot become an order, or null when it can.
 *
 * `isDirty` matters more here than on send: `convertQuoteToOrderAction`
 * freezes a total onto a new order and reserves real stock from the *saved*
 * row, so converting with unsaved edits on screen would build the order from
 * figures the operator is no longer looking at — silently, rather than with
 * an error.
 */
export function quoteConvertBlockReason({ statusReason, isDirty }: QuoteConvertBlockInput): string | null {
  if (statusReason) return statusReason
  if (isDirty) return QUOTE_DIRTY_CONVERT_REASON
  return null
}
