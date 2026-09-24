import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import type { PublicSiteSettings } from "@/lib/queries/settings.queries"

/**
 * The body of the "page not found" screen: the message and the ways back
 * into the catalogue. Shared by the two 404s — the root one, which composes
 * the site header and footer itself because an unmatched URL belongs to no
 * route group, and the public group's, which sits inside the public layout's
 * header and footer — so the two can never say different things.
 */
export function NotFoundContent({ settings }: { settings: PublicSiteSettings }) {
  return (
    <Container className="py-20 md:py-32">
      <div className="flex max-w-2xl flex-col gap-6">
        <span className="eyebrow text-gold-ink">Error 404</span>

        <h1 className="text-h1">This page isn&apos;t here</h1>

        <p className="max-w-xl text-body-lg text-muted-foreground">
          The page you&apos;re looking for may have moved, or the address
          may have been mistyped. Our vehicles and our spare parts are
          both below.
        </p>

        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/cars"
            className={buttonVariants({ variant: "default", size: "lg" })}
          >
            Browse Vehicles
          </Link>
          {/* The parts catalogue is live, so it belongs among the ways
              out of a 404 rather than in an apology above it. */}
          <Link
            href="/spare-parts"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Spare Parts
          </Link>
          <Link
            href="/track-my-order"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Track My Order
          </Link>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <p className="text-small text-muted-foreground">
            Looking for something specific?{" "}
            {settings.catalogDisplay.actions.getQuote ? (
              <>
                <Link
                  href="/get-a-quote"
                  className="text-foreground underline underline-offset-4 hover:text-gold-ink"
                >
                  Request a vehicle
                </Link>{" "}
                or{" "}
              </>
            ) : null}
            <Link
              href="/contact"
              className="text-foreground underline underline-offset-4 hover:text-gold-ink"
            >
              contact our team
            </Link>
            .
          </p>
        </div>
      </div>
    </Container>
  )
}
