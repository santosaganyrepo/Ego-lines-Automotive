import { createHash } from "node:crypto"

import { NextResponse } from "next/server"

import { ADMIN_BASE_PATH } from "@/lib/constants/admin-routes"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"

export const runtime = "nodejs"

/**
 * The web app manifest that makes the dashboard installable — "Add to Home
 * Screen" on iPhone, "Install app" on Android and desktop Chrome/Edge.
 *
 * Scoped to the dashboard alone: the public website is never offered as an
 * app, and an installed dashboard that follows a link to the public site
 * opens it in the browser. `scope` and `start_url` are the base path with no
 * trailing slash, because that is the address the dashboard home lives at;
 * scope matching is a prefix match, so every dashboard page is inside it.
 *
 * Served without a session (browsers fetch manifests without cookies — see
 * PUBLIC_ADMIN_PATHS in src/lib/supabase/proxy.ts). It holds nothing but the
 * business name, colours and icon links; everything behind `start_url` still
 * requires sign-in.
 */
export async function GET() {
  const settings = await getPublicSiteSettings()
  const { businessName, branding } = settings

  // Icons change with the uploaded branding; the version makes a new logo a new URL.
  const version = createHash("sha256")
    .update([businessName, branding.faviconUrl, branding.logoDarkUrl, branding.logoLightUrl].join("|"))
    .digest("hex")
    .slice(0, 10)
  const icon = (file: string) => `/app-icon/${file}?v=${version}`

  const firstWord = businessName.split(/[\s-]+/)[0] ?? businessName
  const shortName = `${firstWord} Admin`.length <= 14 ? `${firstWord} Admin` : "Dashboard"

  const manifest = {
    id: ADMIN_BASE_PATH,
    name: `${businessName} Dashboard`,
    short_name: shortName,
    description: `The ${businessName} staff dashboard.`,
    start_url: ADMIN_BASE_PATH,
    scope: ADMIN_BASE_PATH,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
    lang: "en-GB",
    dir: "ltr",
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      { src: icon("icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon("icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon("maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Quotes", url: `${ADMIN_BASE_PATH}/quotes`, icons: [{ src: icon("icon-192.png"), sizes: "192x192" }] },
      { name: "Orders", url: `${ADMIN_BASE_PATH}/orders`, icons: [{ src: icon("icon-192.png"), sizes: "192x192" }] },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      // Short: a renamed business should reach installed apps soon.
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  })
}
