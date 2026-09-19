// Static site configuration and the fallbacks behind BusinessSettings
import { DEFAULT_BUSINESS_NAME } from "@/lib/constants/branding-options"
import { mainNavLinks, type NavLink } from "@/lib/constants/nav-links"

/**
 * Reads NEXT_PUBLIC_WHATSAPP_NUMBER at module load.
 *
 * NEXT_PUBLIC_-prefixed vars are inlined into the client bundle by Next.js,
 * so this value is visible to anyone viewing page source — fine, since
 * it's a public contact number, not a secret. Never store anything
 * sensitive under a NEXT_PUBLIC_ variable.
 */
function readWhatsAppNumber(): string {
  const value = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER

  if (!value || value.trim().length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[config/site] NEXT_PUBLIC_WHATSAPP_NUMBER is not set — WhatsApp CTAs will not render a link."
      )
    }
    return ""
  }

  return value.trim()
}

/**
 * The site's public origin — used for canonical URLs, the sitemap, structured
 * data, Open Graph images and the links inside emails.
 *
 * NEXT_PUBLIC_SITE_URL is the source of truth and must be set in production
 * (see .env.example). If it is missing on Vercel, the project's own
 * production domain is used, which Vercel exposes to every build; the last
 * resort is the original domain, with a warning in the build log, because a
 * canonical URL pointing at the wrong domain quietly hands search ranking to
 * that domain.
 */
function readSiteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (value) return value.replace(/\/+$/, "")

  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`

  if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
    console.warn(
      "[config/site] NEXT_PUBLIC_SITE_URL is not set — canonical URLs, the sitemap and email links fall back to https://crownlinemotors.com. Set it to the live domain."
    )
  }
  return "https://crownlinemotors.com"
}

export const siteConfig = {
  name: DEFAULT_BUSINESS_NAME,
  tagline: "Quality Cars. Global Standards. Local Commitment.",
  description: "Quality vehicles sourced from Japan, South Korea and China and delivered to South Sudan.",
  url: readSiteUrl(),
  whatsappNumber: readWhatsAppNumber(),
  nav: mainNavLinks,

  // Contact details, business hours and social links are not here: they are
  // edited in Settings → Business information and read through
  // getPublicSiteSettings(). The name, tagline and description below are the
  // fallbacks used only when the settings row cannot be read.
} as const

export type { NavLink }