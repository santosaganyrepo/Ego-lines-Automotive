import { ImageResponse } from "next/og"

import { siteConfig } from "@/config/site"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"
import { OG_IMAGE_SIZE } from "@/lib/seo/page-metadata"

/**
 * The default sharing image (1200 × 630): the business name and tagline on
 * the brand's near-black, with a gold rule.
 *
 * It is what WhatsApp, Facebook, X and LinkedIn show for a shared link when
 * Settings → SEO & social has no image uploaded and the page has no
 * photograph of its own — a link preview with no picture is the one most
 * people scroll past. Listings use their own main photograph instead (see
 * buildPageMetadata).
 *
 * Text only, deliberately: an uploaded logo can be any format and any
 * shape, and a card that fails to render is worse than one without it.
 * The name comes from Settings, so a rebrand changes the card with it.
 */

const BACKGROUND = "#0b0b0b"
const GOLD = "#d9b04c"

export async function GET() {
  const settings = await getPublicSiteSettings()
  const host = new URL(siteConfig.url).host

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: BACKGROUND,
          color: "#ffffff",
        }}
      >
        <div style={{ width: 96, height: 4, background: GOLD, marginBottom: 40 }} />
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.05 }}>
          {settings.businessName}
        </div>
        <div style={{ marginTop: 28, fontSize: 36, color: GOLD, lineHeight: 1.25 }}>{siteConfig.tagline}</div>
        <div style={{ marginTop: 20, fontSize: 28, color: "rgba(255,255,255,0.72)", lineHeight: 1.35, maxWidth: 960 }}>
          Vehicles and spare parts from Japan, South Korea and China, delivered to South Sudan.
        </div>
        <div style={{ position: "absolute", bottom: 56, left: 96, fontSize: 24, color: "rgba(255,255,255,0.55)" }}>
          {host}
        </div>
      </div>
    ),
    {
      ...OG_IMAGE_SIZE,
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    }
  )
}
