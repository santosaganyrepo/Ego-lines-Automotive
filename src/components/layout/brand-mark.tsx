"use client"

import * as React from "react"
import Image from "next/image"

import { useSiteSettings } from "@/components/shared/site-settings-provider"
import { cn } from "@/lib/utils"

const markSizes = {
  sm: {
    word: "text-base",
    sub: "text-[0.5rem]",
    gap: "gap-[0.15rem]",
    logo: "h-7",
    lockupWord: "text-sm tracking-[0.08em]",
    lockupLogo: "h-8",
  },
  default: {
    word: "text-lg md:text-xl",
    sub: "text-[0.5625rem]",
    gap: "gap-[0.2rem]",
    logo: "h-8 md:h-9",
    /**
     * Tighter on a phone than the mark it sits beside would suggest, and
     * deliberately so: the emblem is now 60px there, and at the desktop size
     * and tracking the name no longer fitted on one line between the logo
     * and the menu button — it wrapped, and a two-line wordmark beside a
     * large mark reads as a mistake. From md there is room for both.
     */
    lockupWord: "text-sm tracking-[0.08em] md:text-2xl md:tracking-[0.12em]",
    /**
     * The public header's mark, and the largest thing in the navigation bar
     * by design — the dealership asked for the emblem to carry the header
     * rather than sit in a corner of it. 60px on a phone, 100px from md,
     * against a bar of 80px/112px (site-header.tsx), which is what
     * `--header-offset` in the public layout reserves.
     *
     * Raising these three numbers means raising all three: the bar, the
     * offset, and this.
     */
    lockupLogo: "h-[3.75rem] md:h-[6.25rem]",
  },
  lg: {
    word: "text-2xl md:text-3xl",
    sub: "text-xs",
    gap: "gap-[0.25rem]",
    logo: "h-10 md:h-12",
    lockupWord: "text-xl md:text-2xl",
    lockupLogo: "h-11 md:h-12",
  },
} as const

interface BrandMarkProps extends React.ComponentProps<"span"> {
  size?: keyof typeof markSizes
  /** Hides the second line of the stacked wordmark, for very tight contexts. */
  compact?: boolean
  /**
   * The surface the mark sits on. Picks which uploaded logo to use — a mark
   * drawn for white is usually illegible on black — and is ignored by the
   * text, which inherits `currentColor`.
   */
  tone?: "light" | "dark"
  /**
   * How the mark is composed.
   *
   * `auto`    the uploaded logo on its own, or the stacked wordmark when there
   *           is none. The staff dashboard uses this — its rail is sized for it.
   * `lockup`  the logo, then the business name on one line with its last word
   *           in gold. The public site's header, drawer and footer use this, so
   *           a visitor always reads the name beside the emblem.
   */
  layout?: "auto" | "lockup"
}

/** "Crownline Motors" → ["Crownline", "Motors"]; a one-word name has no accent. */
function splitName(name: string): { lead: string; accent: string | null } {
  const words = name.trim().split(/\s+/)
  return words.length > 1
    ? { lead: words.slice(0, -1).join(" "), accent: words[words.length - 1] }
    : { lead: name.trim(), accent: null }
}

/**
 * The brand, as configured in Settings → Website & branding.
 *
 * Built from the name in Settings, so renaming the business renames the mark.
 * The text inherits `currentColor`, so it works on the transparent hero
 * header, the glass header and the dark footer without a per-surface variant
 * — only the gold is fixed.
 *
 * `auto` renders the uploaded logo for the surface it is on (the other one if
 * only one exists), or without a logo the stacked typographic wordmark: every
 * word but the last in wide capitals, the last small beneath a gold rule.
 */
function BrandMark({
  size = "default",
  compact = false,
  tone = "light",
  layout = "auto",
  className,
  ...props
}: BrandMarkProps) {
  const { businessName, logoLightUrl, logoDarkUrl } = useSiteSettings()
  const scale = markSizes[size]
  const logoUrl = tone === "dark" ? (logoDarkUrl ?? logoLightUrl) : (logoLightUrl ?? logoDarkUrl)
  const { lead, accent } = splitName(businessName)

  if (layout === "lockup") {
    return (
      <span data-slot="brand-mark" className={cn("inline-flex min-w-0 items-center gap-3", className)} {...props}>
        {logoUrl ? (
          <Image
            src={logoUrl}
            // The name is written out beside it, so the image is decorative
            // here — announcing both would read the business name twice.
            alt=""
            // Only seeds the srcset — the rendered size comes from the height
            // class below. Large enough that a wide logo is still sharp at
            // 100px tall on a 2× screen.
            width={320}
            height={320}
            loading="eager"
            // `max-w` matters now the mark is tall: a logo drawn wide rather
            // than square would otherwise take the whole row before the
            // navigation got any. `w-auto` keeps its aspect ratio either way.
            className={cn("w-auto max-w-40 shrink-0 object-contain md:max-w-64", scale.lockupLogo)}
          />
        ) : null}
        <span
          className={cn(
            // Wraps between the words rather than overflowing where a
            // long name meets a narrow row (a small phone, the drawer).
            "min-w-0 font-heading leading-[1.15] font-bold tracking-[0.12em] uppercase",
            scale.lockupWord
          )}
        >
          {lead}
          {accent ? (
            <>
              {" "}
              <span className="font-semibold text-gold-ink">{accent}</span>
            </>
          ) : null}
        </span>
      </span>
    )
  }

  if (logoUrl) {
    return (
      <span data-slot="brand-mark" className={cn("inline-flex items-center", className)} {...props}>
        <Image
          src={logoUrl}
          alt={businessName}
          // The intrinsic box only seeds the srcset; the rendered size comes
          // from the height class, with the width following the logo's own
          // aspect ratio.
          width={320}
          height={96}
          loading="eager"
          className={cn("w-auto max-w-[12rem] object-contain", scale.logo)}
        />
      </span>
    )
  }

  return (
    <span
      data-slot="brand-mark"
      className={cn("inline-flex flex-col leading-none", scale.gap, className)}
      {...props}
    >
      <span className={cn("font-heading font-bold tracking-[0.18em] uppercase", scale.word)}>{lead}</span>

      {!compact && accent ? (
        <span className={cn("flex items-center gap-2", scale.sub)}>
          {/* Thin gold rule — the one piece of brand colour in the mark. */}
          <span aria-hidden="true" className="h-px w-3 bg-gold-ink" />
          <span className="font-heading font-semibold tracking-[0.34em] text-current/70 uppercase">{accent}</span>
        </span>
      ) : null}
    </span>
  )
}

export { BrandMark }
export type { BrandMarkProps }
