import Link from "next/link"
import { ArrowRight, CarFront } from "lucide-react"

import { Container } from "@/components/layout/container"
import { ShowroomHeading } from "@/components/layout/showroom-heading"
import { InView } from "@/components/motion/in-view"
import { delay } from "@/components/motion/motion"
import { BrandLogoGrid } from "@/components/shared/brand-logo-grid"

/**
 * The makes the dealership supplies.
 *
 * Answers the first question a buyer brings — "do you have my brand?" —
 * before they open the catalogue, and leaves the door open for anything not
 * shown: the list is what is typically sourced, not the limit of it.
 */
export function BrandsSection({ showQuote }: { showQuote: boolean }) {
  return (
    <section aria-labelledby="home-brands-heading" className="bg-background py-20 md:py-28">
      <Container size="wide">
        <InView className="flex flex-col gap-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <ShowroomHeading
              id="home-brands-heading"
              icon={CarFront}
              label="Brands we supply"
              lead="The makes you trust,"
              accent="sourced for you."
              description="We are not tied to one manufacturer. We source by reliability, spare-parts availability and value — and your brand is often one message away."
            />
            {showQuote ? (
              <Link
                href="/get-a-quote"
                className="rv-up group/brands inline-flex w-fit shrink-0 items-center gap-2 py-2 text-small font-semibold text-gold pointer-coarse:min-h-11 transition-colors duration-fast hover:text-gold-bright"
                style={delay(500)}
              >
                Request another make
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-fast ease-crownline group-hover/brands:translate-x-1"
                />
              </Link>
            ) : null}
          </div>

          <BrandLogoGrid startDelayMs={450} showMarket={false} />
        </InView>
      </Container>
    </section>
  )
}
