"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { BadgeCheck, Bell, X } from "lucide-react"

import { getQuoteActivityAction, type QuoteActivity } from "@/lib/actions/quote-lead-watch.actions"
import { Button } from "@/components/ui/button"
import { ADMIN_BASE_PATH } from "@/lib/constants/admin-routes"

/** Often enough that an acceptance appears while the operator is still looking. */
const POLL_INTERVAL_MS = 15_000

type Acceptance = QuoteActivity["acceptances"][number]

/**
 * Live alerts in the open dashboard: new enquiries, and customers accepting
 * their quotation online.
 *
 * Push notifications (Settings → Notifications) reach a device whether or
 * not the dashboard is open; this is the in-app half, for the operator who
 * is at the screen. It polls while the tab is visible, stops while it is
 * hidden, and checks at once when the tab comes back — so an acceptance made
 * while the operator was elsewhere is waiting for them on return.
 *
 *   - New enquiries: a banner when the count of NEW quotes rises above what
 *     was last seen. Cleared by visiting the quotes list.
 *   - Acceptances: one card per quotation accepted since the dashboard was
 *     opened, linking to it, until dismissed or opened. The open quote page
 *     is refreshed too, so its status and the acceptance appear without a
 *     reload.
 *
 * `lastSeenRef` rather than `useState` for the baselines: they must update
 * synchronously inside the same poll that reads them, or a second poll
 * landing before a re-render would compare against a stale baseline and
 * could double-fire an alert.
 */
export function QuoteLeadWatcher({ watchLeads }: { watchLeads: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [newCount, setNewCount] = useState(0)
  const [accepted, setAccepted] = useState<Acceptance[]>([])
  const lastSeenRef = useRef<number | null>(null)
  const sinceRef = useRef<string | null>(null)
  const seenAcceptancesRef = useRef(new Set<string>())

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null

    async function poll() {
      const activity = await getQuoteActivityAction(sinceRef.current)
      if (cancelled) return

      // The first read only sets the baseline: "everything already waiting"
      // is not a new alert.
      if (watchLeads && lastSeenRef.current !== null && activity.newLeadCount > lastSeenRef.current) {
        setNewCount(activity.newLeadCount)
      }
      lastSeenRef.current = activity.newLeadCount

      const fresh = activity.acceptances.filter((item) => !seenAcceptancesRef.current.has(item.quoteId))
      if (fresh.length > 0) {
        for (const item of fresh) seenAcceptancesRef.current.add(item.quoteId)
        setAccepted((current) => [...fresh, ...current].slice(0, 3))
        router.refresh()
      }
      sinceRef.current = activity.checkedAt
    }

    function start() {
      if (interval !== null) return
      void poll()
      interval = setInterval(poll, POLL_INTERVAL_MS)
    }

    function stop() {
      if (interval === null) return
      clearInterval(interval)
      interval = null
    }

    function onVisibility() {
      if (document.visibilityState === "visible") start()
      else stop()
    }

    if (document.visibilityState === "visible") start()
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [router, watchLeads])

  /**
   * A visit to the quotes list clears the enquiry banner, and opening an
   * accepted quote clears its card — adjusted during render rather than in an
   * effect (see `VehicleListFilters` for the same pattern), so neither shows
   * for an extra frame on the page it points at.
   */
  const onQuotesList = pathname === `${ADMIN_BASE_PATH}/quotes`
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    if (onQuotesList) setNewCount(0)
    setAccepted((current) => current.filter((item) => pathname !== `${ADMIN_BASE_PATH}/quotes/${item.quoteId}`))
  }

  if (newCount === 0 && accepted.length === 0) return null

  return (
    <div className="fixed right-4 bottom-4 z-40 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3">
      {accepted.map((item) => (
        <div
          key={item.quoteId}
          role="status"
          className="flex items-start gap-3 rounded-xl border border-success/40 bg-popover p-4 text-popover-foreground shadow-[var(--shadow-overlay)]"
        >
          <BadgeCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-small font-medium">
              Customer accepted <span className="font-mono">{item.quoteNumber}</span>
            </p>
            <Button
              render={<Link href={`${ADMIN_BASE_PATH}/quotes/${item.quoteId}`} />}
              size="sm"
              onClick={() => setAccepted((current) => current.filter((other) => other.quoteId !== item.quoteId))}
            >
              Open quote
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setAccepted((current) => current.filter((other) => other.quoteId !== item.quoteId))}
            aria-label={`Dismiss ${item.quoteNumber}`}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ))}

      {newCount > 0 ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-gold-ink/30 bg-popover p-4 text-popover-foreground shadow-[var(--shadow-overlay)]"
        >
          <Bell aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold-ink" />
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-small font-medium">
              {newCount} new enquir{newCount === 1 ? "y" : "ies"} waiting
            </p>
            <Button render={<Link href={`${ADMIN_BASE_PATH}/quotes?status=NEW`} />} size="sm" onClick={() => setNewCount(0)}>
              View
            </Button>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setNewCount(0)} aria-label="Dismiss">
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
