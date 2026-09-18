"use client"

import Link, { useLinkStatus } from "next/link"
import { ChevronDown, Loader2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/utils/format-currency"

/**
 * The end of a catalogue grid: how far through the results the customer is,
 * and the way to the next batch.
 *
 * ── Why a link, not a button that fetches ─────────────────────────────
 * "Load more" points at the next page number, which the catalogue renders as
 * every result from the first page through that one. So the grid grows in
 * place, and the address still says exactly what is on screen: a refresh, a
 * bookmark or a WhatsApp forward reproduces it, the back button steps back a
 * batch, and a search engine can follow the link to the deeper listings.
 * `scroll={false}` keeps the customer where they are, and the navigation
 * runs as a transition, so the cards already shown stay put while the next
 * batch arrives.
 */
export function LoadMore({
  shown,
  total,
  nextHref,
  noun,
  className,
}: {
  shown: number
  total: number
  /** Null once every result is on screen. */
  nextHref: string | null
  /** Plural, lower case: "vehicles", "parts". */
  noun: string
  className?: string
}) {
  if (total === 0) return null

  const progress = Math.min(100, Math.round((shown / total) * 100))

  return (
    <nav aria-label={`More ${noun}`} className={cn("flex flex-col items-center gap-4 pt-8", className)}>
      <div className="flex w-full max-w-xs flex-col items-center gap-3">
        <p className="tabular text-small text-muted-foreground">
          {nextHref ? (
            <>
              Showing {formatNumber(shown)} of {formatNumber(total)} {noun}
            </>
          ) : (
            <>
              You&rsquo;ve seen all {formatNumber(total)} {noun}
            </>
          )}
        </p>
        <div
          role="progressbar"
          aria-label={`${noun} shown`}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={shown}
          className="h-1 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-base ease-crownline"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {nextHref ? (
        <Link
          href={nextHref}
          scroll={false}
          rel="next"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "group/more min-w-56")}
        >
          <LoadMoreLabel noun={noun} />
        </Link>
      ) : null}
    </nav>
  )
}

/** Must render inside the Link: `useLinkStatus` reads the nearest one. */
function LoadMoreLabel({ noun }: { noun: string }) {
  const { pending } = useLinkStatus()

  return pending ? (
    <>
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      <span>Loading {noun}</span>
    </>
  ) : (
    <>
      <span>Load more {noun}</span>
      <ChevronDown
        aria-hidden="true"
        className="size-4 transition-transform duration-fast ease-crownline group-hover/more:translate-y-0.5"
      />
    </>
  )
}
