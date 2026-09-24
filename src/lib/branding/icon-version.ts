import { createHash } from "node:crypto"

/**
 * A short fingerprint of everything the generated app icons and favicon are
 * drawn from.
 *
 * The icons at `/app-icon/[variant]` are rendered on demand from the business
 * name and the logos uploaded in Settings → Website & branding, so their URLs
 * never change on their own — and a browser that has cached a favicon holds
 * on to it stubbornly, which is exactly the "I changed it and nothing
 * happened" the dealership reported. Appending `?v=` from this hash makes a
 * new upload a new URL, so the change is picked up on the next visit and a
 * long cache stays safe in between.
 *
 * Shared by the root layout (the site favicon) and the dashboard manifest
 * (the installable app's icons) so the two can never disagree about which
 * version of the branding they are pointing at.
 */
export interface BrandingIconSource {
  businessName: string
  branding: {
    faviconUrl: string | null
    logoDarkUrl: string | null
    logoLightUrl: string | null
  }
}

export function brandingIconVersion({ businessName, branding }: BrandingIconSource): string {
  return createHash("sha256")
    .update([businessName, branding.faviconUrl, branding.logoDarkUrl, branding.logoLightUrl].join("|"))
    .digest("hex")
    .slice(0, 10)
}

/** `/app-icon/<file>?v=<fingerprint>` — the only way these icons should be linked. */
export function brandingIconUrl(file: string, version: string): string {
  return `/app-icon/${file}?v=${version}`
}
