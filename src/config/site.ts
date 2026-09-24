// Static site configuration and the fallbacks behind BusinessSettings
import { DEFAULT_BUSINESS_NAME } from "@/lib/constants/branding-options"
import { mainNavLinks, type NavLink } from "@/lib/constants/nav-links"
import { publicOriginProblem, resolveSiteUrl } from "@/lib/utils/site-url"

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
 * data, Open Graph images and the links inside emails. The rules live in
 * src/lib/utils/site-url.ts.
 *
 * Every variable is read by its literal name, not by passing `process.env`
 * along: Next.js inlines NEXT_PUBLIC_ values into the browser bundle only
 * where they are written out like this, and the server-only ones (VERCEL_*,
 * CODESPACE_*) simply read as undefined there.
 */
function readSiteUrl(): string {
  const url = resolveSiteUrl({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    NEXT_PUBLIC_VERCEL_BRANCH_URL: process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    CODESPACE_NAME: process.env.CODESPACE_NAME,
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
  })

  if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
    const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    if (!configured) {
      console.warn(`[config/site] NEXT_PUBLIC_SITE_URL is not set — using ${url}. Set it to the live domain.`)
    } else if (publicOriginProblem(configured) && url !== configured.replace(/\/+$/, "")) {
      console.warn(
        `[config/site] NEXT_PUBLIC_SITE_URL ${publicOriginProblem(configured)} — using ${url} instead. Set it to the live https:// domain.`
      )
    }
  }

  return url
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