import Link from "next/link"
import { ArrowRight, Building2 } from "lucide-react"

import { Container } from "@/components/layout/container"
import { ShowroomHeading } from "@/components/layout/showroom-heading"
import { InView } from "@/components/motion/in-view"
import { ITEM_STEP_MS, delay } from "@/components/motion/motion"
import { COMPANY_FACTS, COMPANY_MISSION } from "@/config/company"

/**
 * Who the dealership is, in one screen, with the way through to About Us.
 *
 * Only the essentials a first-time visitor weighs — when the company started,
 * where it is, what it is for — the rest of the story lives on the About page.
 */
export function AboutTeaser({ businessName }: { businessName: string }) {
  return (
    <section aria-labelledby="home-about-heading" className="border-y border-white/8 bg-night py-20 md:py-24">
      <Container size="wide">
        <InView className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div className="flex flex-col gap-8">
            <ShowroomHeading
              id="home-about-heading"
              icon={Building2}
              label={`About ${businessName}`}
              lead="Connecting Africa"
              accent="to the world of mobility."
              description={`${businessName} was founded in 2025 to make sourcing and importing vehicles more reliable, transparent and accessible — with carefully selected vehicles, competitive pricing and professional service.`}
            />
            <Link
              href="/about-us"
              className="rv-up group/about inline-flex w-fit items-center gap-2 py-2 text-small font-semibold text-gold pointer-coarse:min-h-11 transition-colors duration-fast hover:text-gold-bright"
              style={delay(550)}
            >
              More about us
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-fast ease-crownline group-hover/about:translate-x-1"
              />
            </Link>
          </div>

          {/* A pull quote on a gold rule, then the facts as an open row —
              the words carry this section, so nothing is boxed. */}
          <div className="flex flex-col gap-10">
            <blockquote className="rv-up border-l-2 border-gold pl-6 sm:pl-8" style={delay(350)}>
              <p className="text-meta text-gold uppercase">Our mission</p>
              <p className="mt-4 font-heading text-h3 text-balance text-foreground">{COMPANY_MISSION}</p>
            </blockquote>

            <dl className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-8">
              {COMPANY_FACTS.map((fact, index) => (
                <div
                  key={fact.label}
                  className="rv-up flex flex-col gap-1 px-4 first:pl-0 last:pr-0 sm:px-6"
                  style={delay(450 + index * ITEM_STEP_MS)}
                >
                  <dt className="order-2 text-small text-muted-foreground">{fact.label}</dt>
                  <dd className="order-1 font-heading text-title text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </InView>
      </Container>
    </section>
  )
}
