import Image from "next/image"

import { BRAND_CREDITS, VEHICLE_BRANDS, brandLogoSrc, type VehicleBrand } from "@/config/brands"
import { delay } from "@/components/motion/motion"
import { cn } from "@/lib/utils"

/** A square emblem is drawn at this height; longer marks are drawn shorter. */
const BASE_LOGO_REM = 2.5
/** Below 0.5 a wordmark reads as a thin line; 0.4 keeps long and square marks visually even. */
const OPTICAL_EXPONENT = 0.4

function logoHeightRem(brand: VehicleBrand): number {
  return Number((BASE_LOGO_REM * Math.pow(brand.ratio, -OPTICAL_EXPONENT)).toFixed(3))
}

/**
 * Every make the dealership supplies, as a grid of monochrome logos.
 *
 * Monochrome on purpose: fifteen manufacturers' reds and blues side by side
 * would overpower a black-and-gold page, and the shapes are recognisable
 * without their colours. Each logo turns fully opaque on hover.
 *
 * Must sit inside an InView — the tiles use the `.rv-*` reveal.
 */
export function BrandLogoGrid({
  startDelayMs = 300,
  showMarket = true,
  className,
}: {
  startDelayMs?: number
  /** Adds the sourcing market beneath each name. */
  showMarket?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* A logo wall ruled by hairlines rather than fifteen boxes: the
          border sits on the grid's top/left and each cell's bottom/right, so
          every line is drawn exactly once. */}
      <ul
        className="grid grid-cols-3 border-t border-l border-white/10 md:grid-cols-5"
        aria-label="Vehicle brands we supply"
      >
        {VEHICLE_BRANDS.map((brand, index) => (
          <li
            key={brand.slug}
            className="rv-up border-r border-b border-white/10"
            style={delay(startDelayMs + index * 40)}
          >
            <div
              className={cn(
                "group/brand flex h-full flex-col items-center justify-between gap-4 px-3 pt-8 pb-4 text-center",
                "transition-colors duration-base ease-crownline hover:bg-gold/5"
              )}
            >
              <div className="flex h-12 w-full items-center justify-center sm:h-14">
                <Image
                  src={brandLogoSrc(brand)}
                  alt={`${brand.name} logo`}
                  width={Math.round(100 * brand.ratio)}
                  height={100}
                  style={{ height: `${logoHeightRem(brand)}rem` }}
                  className={cn(
                    "w-auto max-w-[85%] object-contain brightness-0 dark:invert",
                    "opacity-70 transition-opacity duration-base ease-crownline group-hover/brand:opacity-100"
                  )}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-small font-medium text-foreground">{brand.name}</span>
                {showMarket ? (
                  <span className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                    {brand.market}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-[0.75rem] leading-relaxed text-muted-foreground/80">
        {BRAND_CREDITS.notice}{" "}
        <a
          href={BRAND_CREDITS.changan.href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-white/20 underline-offset-2 hover:text-foreground"
        >
          {BRAND_CREDITS.changan.text}
        </a>{" "}
        (
        <a
          href={BRAND_CREDITS.changan.licenseHref}
          target="_blank"
          rel="noopener noreferrer license"
          className="underline decoration-white/20 underline-offset-2 hover:text-foreground"
        >
          licence
        </a>
        ).
      </p>
    </div>
  )
}
