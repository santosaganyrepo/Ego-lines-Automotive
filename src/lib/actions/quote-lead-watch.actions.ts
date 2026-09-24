"use server"

import { authorizePermission } from "@/lib/auth/admin-guard"
import { getNewQuoteLeadCount, getRecentCustomerAcceptances } from "@/lib/queries/quote.queries"

/**
 * What the dashboard's live watcher (`QuoteLeadWatcher`) polls for: how many
 * enquiries are waiting in NEW, and which quotations customers have accepted
 * online since the watcher started.
 *
 * A Server Action rather than a route handler: it needs nothing a route
 * would give it (no custom headers, no non-JSON body), and a client
 * component may call an exported "use server" function directly without a
 * `<form>` around it. Authorised the same as any other read of quote
 * data — polling is not a way around `quote:read`.
 *
 * `since` comes from the browser, so it is only ever used as a lower bound
 * on a date comparison, clamped to the last day: an absurd value can widen
 * the window to a day's acceptances at most, never reach anything else.
 *
 * A failed read degrades to "nothing new" rather than surfacing an error
 * banner for a background refresh nobody asked to watch closely — and is
 * logged, so it is not silent.
 */

export interface QuoteActivity {
  /** Server time of this read — the watcher's next `since`. */
  checkedAt: string
  newLeadCount: number
  acceptances: { quoteId: string; quoteNumber: string; acceptedAt: string }[]
}

const MAX_LOOKBACK_MS = 24 * 60 * 60 * 1000

export async function getQuoteActivityAction(since: string | null): Promise<QuoteActivity> {
  const now = new Date()
  const empty: QuoteActivity = { checkedAt: now.toISOString(), newLeadCount: 0, acceptances: [] }

  const auth = await authorizePermission("quote:read")
  if (!auth.ok) return empty

  const parsed = since ? new Date(since) : null
  const lowerBound =
    parsed && !Number.isNaN(parsed.getTime())
      ? new Date(Math.min(now.getTime(), Math.max(parsed.getTime(), now.getTime() - MAX_LOOKBACK_MS)))
      : null

  try {
    const [newLeadCount, acceptances] = await Promise.all([
      getNewQuoteLeadCount(),
      lowerBound ? getRecentCustomerAcceptances(lowerBound) : Promise.resolve([]),
    ])
    return {
      checkedAt: now.toISOString(),
      newLeadCount,
      acceptances: acceptances.map((quote) => ({
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        acceptedAt: quote.acceptedAt.toISOString(),
      })),
    }
  } catch (error) {
    console.error("[quote-lead-watch] failed to read quote activity", error)
    return empty
  }
}
