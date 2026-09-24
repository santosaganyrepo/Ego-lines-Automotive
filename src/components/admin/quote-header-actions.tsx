"use client"

import { Info } from "lucide-react"

import { QuoteConvertDialog } from "@/components/admin/quote-convert-dialog"
import { QuoteDispatchDialog } from "@/components/admin/quote-dispatch-dialog"
import {
  quoteConvertBlockReason,
  quoteDispatchBlockReason,
} from "@/lib/quotes/quote-action-readiness"
import { useQuotePricing } from "@/lib/quotes/quote-pricing-context"

interface QuoteHeaderActionsProps {
  quoteId: string
  customerName: string
  contactEmail: string | null
  contactWhatsapp: string | null
  alreadySent: boolean
  total: number
  /** Why the quote's own status forbids sending, or null when it allows it. */
  sendStatusReason: string | null
  /** Why the quote's own status forbids converting, or null when it allows it. */
  convertStatusReason: string | null
}

/**
 * The quote page's two primary actions, and the one line that explains why
 * either of them is unavailable.
 *
 * ── Why this component exists ────────────────────────────────────────────
 * Each dialog used to carry its own right-aligned explanation directly under
 * its trigger. In the page header's wrapping action row that produced two
 * columns of different heights sitting beside two equally-weighted gold
 * buttons: the buttons fell out of alignment, wrapped onto separate lines at
 * the widths where the hints were widest, and — because the commonest reason
 * by far ("you have unsaved changes") blocks *both* actions — printed the
 * same sentence twice, side by side.
 *
 * So the layout is decided in one place: the two triggers sit in a row with
 * their tops aligned (full width, stacked, on a phone), and the reasons are
 * gathered below them, de-duplicated, as a single quiet line.
 *
 * ── Hierarchy ────────────────────────────────────────────────────────────
 * Only one of the two is the gold call to action at any moment, per the
 * brand brief's "one primary action per surface" rule. Which one follows the
 * work: before the quotation has gone out, sending it is the next step;
 * once it has been sent and can be converted, the order is. The other keeps
 * `outline`, so the pair never reads as two competing primaries.
 *
 * The reasons are computed here *and* inside each dialog, from the same
 * functions in quote-action-readiness.ts, so a dialog dropped anywhere else
 * still refuses for itself and the two can never disagree.
 */
export function QuoteHeaderActions({
  quoteId,
  customerName,
  contactEmail,
  contactWhatsapp,
  alreadySent,
  total,
  sendStatusReason,
  convertStatusReason,
}: QuoteHeaderActionsProps) {
  const { readinessProblem, isDirty } = useQuotePricing()

  const sendBlockedBy = quoteDispatchBlockReason({
    statusReason: sendStatusReason,
    isDirty,
    readinessProblem,
  })
  const convertBlockedBy = quoteConvertBlockReason({
    statusReason: convertStatusReason,
    isDirty,
  })

  // Converting is the next step only once the quotation is actually out and
  // nothing else stands in the way; until then, sending it is.
  const convertLeads = convertBlockedBy === null && alreadySent

  // Same sentence from both buttons — the unsaved-changes case — is shown once.
  const reasons = [...new Set([sendBlockedBy, convertBlockedBy].filter((reason) => reason !== null))]

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-start">
        <QuoteDispatchDialog
          quoteId={quoteId}
          customerName={customerName}
          contactEmail={contactEmail}
          contactWhatsapp={contactWhatsapp}
          alreadySent={alreadySent}
          disabled={sendStatusReason !== null}
          disabledReason={sendStatusReason ?? undefined}
          variant={convertLeads ? "outline" : "default"}
        />
        <QuoteConvertDialog
          quoteId={quoteId}
          total={total}
          disabled={convertStatusReason !== null}
          disabledReason={convertStatusReason ?? undefined}
          variant={convertLeads ? "default" : "outline"}
        />
      </div>

      {reasons.length > 0 ? (
        <ul className="flex w-full max-w-md flex-col gap-1 sm:max-w-sm">
          {reasons.map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-1.5 text-xs text-balance text-muted-foreground sm:justify-end sm:text-right"
            >
              <Info aria-hidden="true" className="mt-px size-3 shrink-0 sm:order-1" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
