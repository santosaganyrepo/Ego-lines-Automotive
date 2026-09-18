import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  Check,
  Compass,
  FileText,
  Gem,
  Handshake,
  HeartHandshake,
  Lightbulb,
  Map as MapIcon,
  Scale,
  Search,
  Sparkles,
  Target,
  Telescope,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Container } from "@/components/layout/container"
import { ShowroomHeading } from "@/components/layout/showroom-heading"
import { AnimatedWords, wordsDuration } from "@/components/motion/animated-words"
import { InView } from "@/components/motion/in-view"
import { ITEM_STEP_MS, delay } from "@/components/motion/motion"
import { BrandLogoGrid } from "@/components/shared/brand-logo-grid"
import { WhatsAppGlyph } from "@/components/shared/whatsapp-glyph"
import { Button } from "@/components/ui/button"
import {
  AFTER_SALES,
  COMPANY_DIFFERENCE,
  COMPANY_FOUNDED_YEAR,
  COMPANY_MISSION,
  COMPANY_TAGLINE,
  COMPANY_TEAM,
  COMPANY_VALUES,
  COMPANY_VISION,
  FUTURE_SERVICES,
  GROWTH_PATH,
  INSPECTION_NOTE,
  SELECTION_CRITERIA,
  SOURCING_MARKETS,
  companyCommitment,
  companyStory,
} from "@/config/company"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"
import { buildGeneralWhatsAppMessage, buildWhatsAppUrl } from "@/lib/utils/whatsapp"

export async function generateMetadata(): Promise<Metadata> {
  const { businessName } = await getPublicSiteSettings()

  return {
    title: "About Us",
    description: `${businessName} was founded in ${COMPANY_FOUNDED_YEAR} in South Sudan to connect African customers with quality vehicles from Japan, South Korea and China — through reliable sourcing, competitive pricing and professional service.`,
    alternates: { canonical: "/about-us" },
  }
}

const HERO_LEAD = "Connecting Africa"
const HERO_ACCENT = "to the world of mobility."
const HERO_TEXT_AT = 160 + wordsDuration(HERO_LEAD) + wordsDuration(HERO_ACCENT) + 80

const COMMITMENT_LEAD = "A company"
const COMMITMENT_ACCENT = "customers can trust."

const VALUE_ICONS: Record<(typeof COMPANY_VALUES)[number]["title"], LucideIcon> = {
  Integrity: Scale,
  Quality: Gem,
  Transparency: Search,
  "Customer focus": HeartHandshake,
  "Innovation & growth": Lightbulb,
}

const AFTER_SALES_ICONS: Record<(typeof AFTER_SALES.services)[number]["title"], LucideIcon> = {
  Documentation: FileText,
  "Spare parts": Wrench,
  Servicing: Handshake,
}

/**
 * About Us (brief §2 navigation).
 *
 * The business's own account of itself, grouped by what a buyer is deciding
 * rather than in the order it was written: who we are, what we stand for,
 * how we choose vehicles, what we sell, what happens after the sale, and
 * where the company is going. Every mention of the company's name comes from
 * Settings, so a rename in the dashboard renames this page.
 *
 * Dark throughout, like the homepage and How It Works.
 */
export default async function AboutUsPage() {
  const settings = await getPublicSiteSettings()
  const { businessName } = settings
  const showQuote = settings.catalogDisplay.actions.getQuote
  const whatsappUrl = buildWhatsAppUrl({
    phoneNumber: settings.contact.whatsappNumber,
    message: buildGeneralWhatsAppMessage(businessName),
  })

  const facts = [
    { label: "Founded", value: String(COMPANY_FOUNDED_YEAR) },
    { label: "Based in", value: "South Sudan" },
    { label: "Sourcing from", value: SOURCING_MARKETS.join(" · ") },
    { label: "Serving", value: "South Sudan & East Africa" },
  ]

  return (
    <div className="dark bg-background text-foreground">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-night text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <Image
            src="/images/journey/vehicle-shipping.jpg"
            alt=""
            fill
            preload
            sizes="100vw"
            className="load-settle object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-night via-night/80 to-night/25" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        <Container size="wide" className="flex flex-col gap-6 py-20 md:py-28 lg:py-32">
          <Breadcrumbs items={[{ label: "About Us" }]} className="load-rise hidden sm:block" />
          <p className="load-rise text-small font-semibold tracking-[0.2em] text-gold uppercase">
            About {businessName}
          </p>
          <h1 className="max-w-4xl text-h1 sm:text-display">
            <AnimatedWords text={HERO_LEAD} trigger="load" startDelay={160} />{" "}
            <span className="text-gold">
              <AnimatedWords text={HERO_ACCENT} trigger="load" startDelay={160 + wordsDuration(HERO_LEAD)} />
            </span>
          </h1>
          <p className="load-rise max-w-2xl text-body-lg text-white/75" style={delay(HERO_TEXT_AT)}>
            A modern automotive company connecting customers across Africa with quality vehicles from leading
            international markets — starting in South Sudan.
          </p>
          <div className="load-rise flex flex-wrap gap-3 pt-2" style={delay(HERO_TEXT_AT + 120)}>
            <Button render={<Link href="/cars" />} size="lg" className="group/cta">
              Browse vehicles
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-fast ease-crownline group-hover/cta:translate-x-1"
              />
            </Button>
            <Button render={<Link href="/contact" />} variant="outline" size="lg">
              Contact us
            </Button>
          </div>
        </Container>
      </section>

      {/* ── At a glance ────────────────────────────────────────────── */}
      <section aria-label="At a glance" className="bg-background">
        <Container size="wide">
          <InView>
            {/* Open, between two hairlines — a line of facts, not a panel. */}
            <dl className="grid grid-cols-2 gap-y-8 border-y border-white/10 py-8 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
              {facts.map((fact, index) => (
                <div
                  key={fact.label}
                  className="rv-up flex flex-col gap-2 pr-4 lg:px-8 lg:first:pl-0"
                  style={delay(200 + index * ITEM_STEP_MS)}
                >
                  <dt className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    {fact.label}
                  </dt>
                  <dd className="font-heading text-title text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </InView>
        </Container>
      </section>

      {/* ── Our story ──────────────────────────────────────────────── */}
      <section aria-labelledby="story-heading" className="bg-background py-20 md:py-28">
        <Container size="wide">
          <InView className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="flex flex-col gap-8">
              <ShowroomHeading
                id="story-heading"
                icon={Compass}
                label="Our story"
                lead="Built to make importing"
                accent="simpler and safer."
              />
              <div className="flex flex-col gap-4">
                {companyStory(businessName).map((paragraph, index) => (
                  <p
                    key={paragraph}
                    className="rv-up text-body-lg text-muted-foreground"
                    style={delay(450 + index * ITEM_STEP_MS)}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rv-up relative aspect-[16/11] overflow-hidden rounded-2xl" style={delay(350)}>
                <Image
                  src="/images/journey/vehicle-secured.jpg"
                  alt="A customer and an adviser reviewing a vehicle together"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night/60 to-transparent" />
              </div>
              <div className="rv-up flex gap-4 rounded-2xl border border-white/10 bg-card/70 p-6" style={delay(500)}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                  <Users aria-hidden="true" className="size-5" />
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-heading text-title text-foreground">Our founders and team</h3>
                  <p className="text-body text-muted-foreground">{COMPANY_TEAM}</p>
                </div>
              </div>
            </div>
          </InView>
        </Container>
      </section>

      {/* ── Mission & vision ───────────────────────────────────────── */}
      <section aria-labelledby="purpose-heading" className="relative isolate overflow-hidden bg-night py-20 md:py-28">
        <div aria-hidden="true" className="bg-dot-grid absolute inset-0 -z-10" />
        <Container size="wide">
          <InView className="flex flex-col gap-12">
            <ShowroomHeading
              id="purpose-heading"
              icon={Target}
              label="Mission & vision"
              lead="Why we exist,"
              accent="and where we are going."
              align="center"
            />
            {/* Two statements, set as type — divided by a single gold hairline
                rather than boxed, because they are words to read, not objects
                to pick up. */}
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-0">
              {[
                { icon: Target, title: "Our mission", body: COMPANY_MISSION },
                { icon: Telescope, title: "Our vision", body: COMPANY_VISION },
              ].map((item, index) => (
                <article
                  key={item.title}
                  className={
                    index === 0
                      ? "rv-up flex flex-col gap-6 md:pr-12 lg:pr-16"
                      : "rv-up flex flex-col gap-6 border-t border-gold/25 pt-12 md:border-t-0 md:border-l md:pt-0 md:pl-12 lg:pl-16"
                  }
                  style={delay(400 + index * ITEM_STEP_MS)}
                >
                  <h3 className="flex items-center gap-3 text-meta text-gold uppercase">
                    <item.icon aria-hidden="true" className="size-4" />
                    {item.title}
                  </h3>
                  <p className="max-w-xl font-heading text-h2 text-balance text-foreground">{item.body}</p>
                </article>
              ))}
            </div>
          </InView>
        </Container>
      </section>

      {/* ── Values ─────────────────────────────────────────────────── */}
      <section aria-labelledby="values-heading" className="bg-background py-20 md:py-28">
        <Container size="wide">
          {/* An editorial list beside its heading rather than a row of five
              identical tiles: numbered, divided by hairlines, read top to
              bottom like the principles they are. */}
          <InView className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <ShowroomHeading
                id="values-heading"
                icon={BadgeCheck}
                label="Our values"
                lead="Five principles"
                accent="behind every sale."
              />
            </div>
            <ol className="flex flex-col divide-y divide-white/10 border-y border-white/10">
              {COMPANY_VALUES.map((value, index) => {
                const Icon = VALUE_ICONS[value.title]
                return (
                  <li
                    key={value.title}
                    className="rv-up group/value grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 gap-y-2 py-6 sm:grid-cols-[3rem_minmax(0,14rem)_minmax(0,1fr)] sm:items-baseline sm:gap-x-8 sm:py-8"
                    style={delay(300 + index * ITEM_STEP_MS)}
                  >
                    <span className="tabular font-heading text-title text-gold/70 transition-colors duration-fast group-hover/value:text-gold">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="flex items-center gap-3 font-heading text-title text-foreground">
                      <Icon aria-hidden="true" className="size-5 shrink-0 text-gold" />
                      {value.title}
                    </h3>
                    <p className="col-start-2 text-body text-muted-foreground sm:col-start-3">{value.body}</p>
                  </li>
                )
              })}
            </ol>
          </InView>
        </Container>
      </section>

      {/* ── How we choose vehicles ─────────────────────────────────── */}
      <section aria-labelledby="sourcing-heading" className="border-y border-white/8 bg-night py-20 md:py-28">
        <Container size="wide">
          <InView className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="flex flex-col gap-8">
              <ShowroomHeading
                id="sourcing-heading"
                icon={Search}
                label="How we choose vehicles"
                lead="Selected with care,"
                accent="checked before shipping."
                description={COMPANY_DIFFERENCE}
              />
              <div className="rv-up relative aspect-[16/10] overflow-hidden rounded-2xl" style={delay(500)}>
                <Image
                  src="/images/journey/parts-confirmed.jpg"
                  alt="A technician inspecting engine components"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="flex flex-col gap-6 self-center">
              <div className="rv-up flex flex-col gap-3" style={delay(350)}>
                <h3 className="font-heading text-title text-foreground">Where we source</h3>
                <ul className="flex flex-wrap gap-2" aria-label="Sourcing markets">
                  {SOURCING_MARKETS.map((market) => (
                    <li
                      key={market}
                      className="rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-small font-medium text-gold"
                    >
                      {market}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rv-up rounded-2xl border border-white/10 bg-card/70 p-6 sm:p-8" style={delay(450)}>
                <h3 className="mb-6 font-heading text-title text-foreground">What we weigh before we buy</h3>
                <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  {SELECTION_CRITERIA.map((criterion) => (
                    <li key={criterion} className="flex gap-3 text-body text-muted-foreground">
                      <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-gold" />
                      {criterion}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 border-t border-white/8 pt-6 text-small text-muted-foreground">{INSPECTION_NOTE}</p>
              </div>
            </div>
          </InView>
        </Container>
      </section>

      {/* ── Brands ─────────────────────────────────────────────────── */}
      <section aria-labelledby="about-brands-heading" className="bg-background py-20 md:py-28">
        <Container size="wide">
          <InView className="flex flex-col gap-12">
            <ShowroomHeading
              id="about-brands-heading"
              icon={CarFront}
              label="Brands we supply"
              lead="Not tied to"
              accent="one manufacturer."
              description="Our range follows demand, availability, reliability and value — and it keeps growing as we build relationships with more suppliers and manufacturers. Looking for another established make? Ask us."
            />
            <BrandLogoGrid startDelayMs={450} />
          </InView>
        </Container>
      </section>

      {/* ── After-sales ────────────────────────────────────────────── */}
      <section aria-labelledby="after-sales-heading" className="relative isolate overflow-hidden bg-night py-20 md:py-28">
        <div aria-hidden="true" className="bg-dot-grid absolute inset-0 -z-10" />
        <Container size="wide">
          <InView className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
            <div className="rv-up relative order-2 aspect-[4/3] overflow-hidden rounded-2xl lg:order-1" style={delay(350)}>
              <Image
                src="/images/journey/vehicle-handover.jpg"
                alt="Car keys being handed to a customer"
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="order-1 flex flex-col gap-8 lg:order-2">
              <ShowroomHeading
                id="after-sales-heading"
                icon={HeartHandshake}
                label="After-sales support"
                lead="We stay with you"
                accent="after the handover."
                description={`${AFTER_SALES.intro} We aim to provide and facilitate the support you need once the car is yours.`}
              />
              <ul className="flex flex-col divide-y divide-white/10">
                {AFTER_SALES.services.map((service, index) => {
                  const Icon = AFTER_SALES_ICONS[service.title]
                  return (
                    <li
                      key={service.title}
                      className="rv-up flex items-start gap-4 py-6 first:pt-0 last:pb-0"
                      style={delay(500 + index * ITEM_STEP_MS)}
                    >
                      <Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-gold" />
                      <div className="flex flex-col gap-0.5">
                        <h3 className="font-heading text-title text-foreground">{service.title}</h3>
                        <p className="text-body text-muted-foreground">{service.body}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="rv-up text-small text-muted-foreground" style={delay(800)}>
                {AFTER_SALES.terms}
              </p>
            </div>
          </InView>
        </Container>
      </section>

      {/* ── The road ahead ─────────────────────────────────────────── */}
      <section aria-labelledby="future-heading" className="bg-background py-20 md:py-28">
        <Container size="wide">
          <InView className="flex flex-col gap-12">
            <ShowroomHeading
              id="future-heading"
              icon={MapIcon}
              label="The road ahead"
              lead="From South Sudan"
              accent="to Africa and beyond."
              description="We are building a full-service African automotive company, not simply a dealership."
            />

            {/* A route, not three tiles: one line from where the company is to
                where it is going, each stop a node on it. Vertical on a phone,
                across the page from md up. */}
            <ol className="relative grid grid-cols-1 gap-10 pl-8 md:grid-cols-3 md:gap-8 md:pt-10 md:pl-0">
              <span
                aria-hidden="true"
                className="absolute top-2 bottom-2 left-[0.3125rem] w-px bg-gradient-to-b from-gold via-gold/40 to-white/10 md:top-[0.3125rem] md:right-0 md:bottom-auto md:left-0 md:h-px md:w-auto md:bg-gradient-to-r"
              />
              {GROWTH_PATH.map((step, index) => (
                <li
                  key={step.stage}
                  className="rv-up relative flex flex-col gap-2"
                  style={delay(400 + index * ITEM_STEP_MS)}
                >
                  <span
                    aria-hidden="true"
                    className={
                      index === 0
                        ? "absolute top-1 -left-8 size-3 rounded-full bg-gold ring-4 ring-gold/20 md:-top-10 md:left-0"
                        : "absolute top-1 -left-8 size-3 rounded-full border border-gold/60 bg-background md:-top-10 md:left-0"
                    }
                  />
                  <span className="text-meta text-gold uppercase">
                    <span className="tabular">{String(index + 1).padStart(2, "0")}</span> · {step.stage}
                  </span>
                  <h3 className="font-heading text-h3 text-foreground">{step.place}</h3>
                  <p className="max-w-xs text-body text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="rv-up flex flex-col gap-6 border-t border-white/10 pt-10" style={delay(700)}>
              <div className="flex items-center gap-3">
                <Sparkles aria-hidden="true" className="size-5 text-gold" />
                <h3 className="font-heading text-title text-foreground">Services we are developing</h3>
              </div>
              <ul className="flex flex-wrap gap-2">
                {FUTURE_SERVICES.map((service) => (
                  <li
                    key={service}
                    className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-small text-foreground/85"
                  >
                    {service}
                  </li>
                ))}
              </ul>
            </div>
          </InView>
        </Container>
      </section>

      {/* ── Commitment & next step ─────────────────────────────────── */}
      <section aria-labelledby="commitment-heading" className="relative isolate overflow-hidden border-t border-white/8 bg-night py-20 md:py-28">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 -z-10 mx-auto h-72 max-w-3xl -translate-y-1/2 rounded-full bg-gold/10 blur-3xl"
        />
        <Container size="wide">
          <InView className="flex flex-col items-center gap-6 text-center">
            <p className="rv-up text-small font-semibold tracking-[0.2em] text-gold uppercase">Our commitment</p>
            <h2 id="commitment-heading" className="max-w-3xl text-h1 text-foreground">
              <AnimatedWords text={COMMITMENT_LEAD} startDelay={100} />{" "}
              <span className="text-gold">
                <AnimatedWords text={COMMITMENT_ACCENT} startDelay={100 + wordsDuration(COMMITMENT_LEAD)} />
              </span>
            </h2>
            <p className="rv-up max-w-2xl text-body-lg text-muted-foreground" style={delay(550)}>
              {companyCommitment(businessName)}
            </p>
            <div className="rv-up flex flex-wrap justify-center gap-3 pt-2" style={delay(700)}>
              <Button render={<Link href="/cars" />} size="lg">
                Browse vehicles
              </Button>
              {showQuote ? (
                <Button render={<Link href="/get-a-quote" />} variant="outline" size="lg">
                  Get a quote
                </Button>
              ) : null}
              {whatsappUrl ? (
                <Button
                  render={<a href={whatsappUrl} target="_blank" rel="noopener noreferrer" />}
                  variant="whatsapp"
                  size="lg"
                >
                  <WhatsAppGlyph className="size-4" />
                  WhatsApp us
                </Button>
              ) : null}
            </div>
            <p className="rv-up pt-6 text-small font-semibold tracking-[0.2em] text-muted-foreground uppercase" style={delay(850)}>
              {businessName} · {COMPANY_TAGLINE}
            </p>
          </InView>
        </Container>
      </section>
    </div>
  )
}
