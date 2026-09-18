import Image from "next/image"
import Link from "next/link"
import { ArrowRight, MessageSquareText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { heroAnchorProps } from "@/components/layout/hero-anchor"
import { AnimatedWords, wordsDuration } from "@/components/motion/animated-words"
import { delay } from "@/components/motion/motion"
import { HOME_MEDIA } from "@/components/home/home-media"

interface HomeHeroProps {
  businessName: string
  showQuote: boolean
}

/** The positioning statement, one line per phrase. */
const STATEMENT = ["Quality Cars.", "Global Standards.", "Local Commitment."] as const

/** When each line starts: a line begins shortly after the previous one has. */
const LINE_STARTS = STATEMENT.reduce<number[]>((starts, _line, index) => {
  const start = index === 0 ? 260 : starts[index - 1] + wordsDuration(STATEMENT[index - 1]) + 90
  return [...starts, start]
}, [])

const STATEMENT_DONE = LINE_STARTS[2] + wordsDuration(STATEMENT[2])

/** "Crownline Motors" → the lead words and the last, which is set in gold. */
function splitName(name: string) {
  const words = name.trim().split(/\s+/)
  return words.length > 1
    ? { lead: words.slice(0, -1).join(" "), accent: words[words.length - 1] }
    : { lead: name.trim(), accent: null }
}

/**
 * The homepage's opening screen.
 *
 * Deliberately spare, and stacked as one block on the left: the dealership's
 * name sits directly above the positioning statement it introduces, with the
 * two actions beneath. Over a glass pane that darkens behind the words and
 * clears towards the right, where the photograph is left to itself.
 *
 *     ┌──────────────────────────────────────────────────────────┐
 *     │                     ▓▓▒▒░░                               │
 *     │ ── SUDARA AUTOMOTIVE▓▓▒▒░░                               │
 *     │ Quality Cars.       ▓▓▒▒░░       photograph              │
 *     │ Global Standards.   ▓▓▒▒░░                               │
 *     │ Local Commitment.   ▓▓▒▒░░                               │
 *     │ [Explore] [Quote]   ▓▓▒▒░░                               │
 *     │                                                          │
 *     │                                 scroll                   │
 *     └──────────────────────────────────────────────────────────┘
 *
 * The name is the eyebrow to the statement rather than a separate mark high
 * in the frame: read together they are one sentence — who this is, and what
 * they promise — and separating them left the top line looking like a stray
 * label on a phone, where the gap between them was most of the screen.
 *
 * Everything animates on first paint rather than on scroll, because it is
 * already on screen: waiting for hydration would leave the most important
 * copy on the site blank on a slow phone.
 */
export function HomeHero({ businessName, showQuote }: HomeHeroProps) {
  const name = splitName(businessName)

  return (
    <section
      {...heroAnchorProps}
      aria-labelledby="home-hero-heading"
      // Pulled up under the fixed header, which is clear over it until the
      // visitor scrolls — see the note on <main> in the public layout.
      className="relative isolate -mt-(--header-offset) flex flex-col overflow-hidden bg-night text-white md:min-h-svh"
    >
      {/*
        The photograph, framed per device from one image (one preload, one
        download):

          phone      a full-width 4:3 frame above the words, sharp and shown
                     whole — a landscape photograph cropped to a tall phone
                     screen kept a third of its width and lost the car;
          md and up  the full-bleed background behind the words, with the
                     frosted pane that clears towards the right.
      */}
      <div
        aria-hidden="true"
        className="relative aspect-[4/3] w-full overflow-hidden md:absolute md:inset-0 md:-z-10 md:aspect-auto"
      >
        {/* The surface beneath the photograph: what shows while it decodes,
            and in its place if the file is ever missing. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_75%_45%,oklch(0.8_0.145_85/0.14),transparent_70%)]" />
        <div className="bg-dot-grid absolute inset-0" />

        {/*
          The page's LCP element. `preload` and `fetchPriority="high"` start it
          before the parser reaches it; quality 90 (allowed in next.config.ts)
          because this is the one image the whole brand is judged by, and the
          optimiser still serves it as AVIF/WebP at the width the device needs.
        */}
        <Image
          src={HOME_MEDIA.hero.src}
          alt={HOME_MEDIA.hero.alt}
          fill
          preload
          fetchPriority="high"
          quality={90}
          sizes="100vw"
          className="load-settle object-cover object-[65%_center]"
        />

        {/* Phone: a shade under the header, and a fade into the words below. */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-night/75 to-transparent md:hidden" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night to-transparent md:hidden" />

        {/*
          md and up: the glass — a deeper pane behind the words that clears
          towards the right, so the copy is legible and the photograph stays
          crisp where there is none. No blur across the whole picture: it
          softened the car itself.
        */}
        <div className="hero-glass absolute inset-0 hidden bg-night/55 backdrop-blur-xl backdrop-saturate-125 md:block" />
        <div className="absolute inset-0 hidden bg-gradient-to-t from-night/90 via-night/40 to-transparent md:block lg:bg-gradient-to-r lg:from-night/85 lg:via-night/45 lg:via-45% lg:to-transparent lg:to-75%" />
        <div className="absolute inset-x-0 top-0 hidden h-32 bg-gradient-to-b from-night/70 to-transparent md:block" />
        <div className="absolute inset-x-0 bottom-0 hidden h-40 bg-gradient-to-t from-background to-transparent md:block" />
      </div>

      <Container size="wide" className="flex flex-1 flex-col justify-center pt-2 pb-4 md:pt-[calc(var(--header-offset)+4rem)] md:pb-24">
        {/* The name, then the statement it introduces, then the two actions. */}
        <div className="flex flex-col gap-6 sm:gap-8 lg:max-w-3xl">
          {/* Hidden from assistive technology: the heading below carries the
              name for screen readers, so it is not announced twice. The rule
              shrinks on a phone, where a 40px lead-in eats into a line that
              has to hold the whole business name. */}
          <p
            aria-hidden="true"
            className="load-rise flex items-center gap-3 font-heading text-small font-semibold tracking-[0.28em] uppercase sm:gap-3 sm:tracking-[0.32em]"
            style={delay(120)}
          >
            <span aria-hidden="true" className="h-px w-6 shrink-0 bg-gold sm:w-10" />
            <span className="min-w-0">
              <span className="text-white/90">{name.lead}</span>
              {name.accent ? <span className="text-gold"> {name.accent}</span> : null}
            </span>
          </p>

          <h1 id="home-hero-heading" className="flex flex-col text-hero">
            <span className="sr-only">{businessName}: </span>
            {STATEMENT.map((line, index) => (
              <span key={line} className="block">
                <AnimatedWords
                  text={line}
                  trigger="load"
                  startDelay={LINE_STARTS[index]}
                  wordClassName={index === 2 ? "text-gold-sheen" : undefined}
                />
              </span>
            ))}
          </h1>

          {/* Full-width buttons on the narrowest phones, where two side by
              side leave each too small to be a comfortable tap target. */}
          <div
            className="load-rise flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap"
            style={delay(STATEMENT_DONE + 120)}
          >
            <Button render={<Link href="/cars" />} size="lg" className="group/cta w-full sm:w-auto">
              Explore cars
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-fast ease-crownline group-hover/cta:translate-x-1"
              />
            </Button>
            {showQuote ? (
              <Button
                render={<Link href="/get-a-quote" />}
                variant="outline"
                size="lg"
                className="w-full backdrop-blur-md sm:w-auto"
              >
                <MessageSquareText aria-hidden="true" className="size-4" />
                Get a quote
              </Button>
            ) : null}
          </div>
        </div>
      </Container>

      {/* A cue that there is more below. Decorative, and hidden where the
          hero is already shorter than the screen. */}
      <div
        aria-hidden="true"
        className="load-rise pointer-events-none absolute inset-x-0 bottom-8 hidden flex-col items-center gap-2 text-small text-white/50 lg:flex [@media(max-height:820px)]:hidden"
        style={delay(STATEMENT_DONE + 700)}
      >
        Scroll to explore
        <span className="flex h-9 w-5.5 justify-center rounded-full border border-white/30 pt-2">
          <span className="scroll-cue-dot block h-2 w-1 rounded-full bg-gold" />
        </span>
      </div>
    </section>
  )
}
