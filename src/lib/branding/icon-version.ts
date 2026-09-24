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

/**
 * Bumped whenever the *drawing* in src/app/app-icon/[variant]/route.tsx
 * changes, so browsers holding the old picture fetch the new one even though
 * no branding was re-uploaded. 3: favicon is a square tile, the mark found by
 * brightness and drawn at 90% of it (2 was a clipped interim render).
 */
const ICON_RENDERING_REVISION = "3"

export function brandingIconVersion({ businessName, branding }: BrandingIconSource): string {
  return createHash("sha256")
    .update(
      [ICON_RENDERING_REVISION, businessName, branding.faviconUrl, branding.logoDarkUrl, branding.logoLightUrl].join("|")
    )
    .digest("hex")
    .slice(0, 10)
}

/** `/app-icon/<file>?v=<fingerprint>` — the only way these icons should be linked. */
export function brandingIconUrl(file: string, version: string): string {
  return `/app-icon/${file}?v=${version}`
}
