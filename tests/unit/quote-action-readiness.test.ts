import { describe, expect, it } from "vitest"

import {
  QUOTE_DIRTY_CONVERT_REASON,
  QUOTE_DIRTY_SEND_REASON,
  quoteConvertBlockReason,
  quoteDispatchBlockReason,
} from "@/lib/quotes/quote-action-readiness"

/**
 * The quote page's two primary actions ask these functions why they cannot
 * run, and so does the header that prints one explanation for both. If the
 * two disagreed — a button enabled with a reason printed beneath it, or the
 * reverse — an operator would be told one thing and shown another, which is
 * how the buttons ended up looking broken in the first place.
 *
 * What matters here is the *precedence*, not the wording: unsaved changes
 * must be reported before draft readiness, because both server actions
 * re-read the quote from the database rather than from the draft on screen.
 * Reporting "add a price" for a price already typed into the form sends an
 * operator round a loop they cannot get out of.
 */
describe("quoteDispatchBlockReason", () => {
  it("allows sending when nothing is in the way", () => {
    expect(
      quoteDispatchBlockReason({ statusReason: null, isDirty: false, readinessProblem: null })
    ).toBeNull()
  })

  it("reports the quote's own status first", () => {
    expect(
      quoteDispatchBlockReason({
        statusReason: "This quote is not in a state that can be sent.",
        isDirty: true,
        readinessProblem: "Add a price to every line.",
      })
    ).toBe("This quote is not in a state that can be sent.")
  })

  it("reports unsaved changes before draft readiness", () => {
    expect(
      quoteDispatchBlockReason({
        statusReason: null,
        isDirty: true,
        readinessProblem: "Add a price to every line.",
      })
    ).toBe(QUOTE_DIRTY_SEND_REASON)
  })

  it("falls through to what the draft is still missing", () => {
    expect(
      quoteDispatchBlockReason({
        statusReason: null,
        isDirty: false,
        readinessProblem: "Add a price to every line.",
      })
    ).toBe("Add a price to every line.")
  })

  it("treats an absent status reason as no objection", () => {
    expect(quoteDispatchBlockReason({ isDirty: false, readinessProblem: null })).toBeNull()
  })
})

describe("quoteConvertBlockReason", () => {
  it("allows converting when nothing is in the way", () => {
    expect(quoteConvertBlockReason({ statusReason: null, isDirty: false })).toBeNull()
  })

  it("reports the quote's own status first", () => {
    expect(
      quoteConvertBlockReason({ statusReason: "This quote has already been converted.", isDirty: true })
    ).toBe("This quote has already been converted.")
  })

  /**
   * Converting freezes a total onto a new order and reserves real stock from
   * the *saved* row. Unsaved edits on screen would therefore build an order
   * from figures the operator is no longer looking at — silently. This is the
   * one case where blocking matters more than explaining.
   */
  it("refuses while the draft has unsaved changes", () => {
    expect(quoteConvertBlockReason({ statusReason: null, isDirty: true })).toBe(
      QUOTE_DIRTY_CONVERT_REASON
    )
  })

  it("does not consider draft readiness, which converting never reads", () => {
    // No `readinessProblem` parameter exists on purpose: the action reads the
    // database, so an incomplete draft is not what stands in its way.
    expect(quoteConvertBlockReason({ isDirty: false })).toBeNull()
  })
})

describe("the two reasons", () => {
  it("are distinct, so the header prints both when both apply", () => {
    // They are near-identical sentences, and the de-duplication in
    // quote-header-actions.tsx is by exact string. If these ever became the
    // same text, one button's explanation would silently vanish.
    expect(QUOTE_DIRTY_SEND_REASON).not.toBe(QUOTE_DIRTY_CONVERT_REASON)
  })
})
