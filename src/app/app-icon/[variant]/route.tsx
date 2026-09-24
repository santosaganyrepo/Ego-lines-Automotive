import { NextResponse, type NextRequest } from "next/server"
import { ImageResponse } from "next/og"
import sharp, { type OverlayOptions } from "sharp"

import { getPublicSiteSettings } from "@/lib/queries/settings.queries"

export const runtime = "nodejs"

/**
 * The dashboard app's icons, drawn from the dealership's own branding.
 *
 * The favicon and logos are uploaded in Settings → Website & branding, so the
 * icons cannot be files in the repository: they are rendered here from
 * whichever of those exists, on the brand's near-black. With nothing uploaded
 * (or storage unreachable, or an image that will not decode) the icon is a
 * gold monogram of the business name — every variant always returns a PNG,
 * because a manifest icon that fails is a failed install.
 *
 * Deliberately not under the dashboard's path: an icon says nothing about the
 * admin area, and browsers fetch icons without a session.
 *
 * The manifest links these with `?v=` set from the branding, so a new logo is
 * a new URL and a long cache is safe.
 */

const BACKGROUND = "#0f0f0f"
const GOLD = "#d9b04c"

type Variant = {
  size: number
  maskable?: boolean
  /** Share of the edge the artwork may use: maskable icons keep to the safe zone. */
  inset: number
  badge?: boolean
  /**
   * Draw the icon as a favicon: a full square tile, the mark filling it.
   *
   * The way Sentry's and Supabase's tab icons work, at the dealership's
   * request. A browser tab shows the icon at 16px, so the mark is the only
   * thing that matters there and every pixel spent on a frame or on the
   * upload's own padding is taken from it. So the mark is located in the
   * upload (markBounds) and drawn at FAVICON_MARK_SHARE of the tile, on the
   * upload's own background colour, with square corners — nothing of the
   * mark can be cut off. This replaced a disc, which could only use ~73% of
   * its diameter for a mark that fills its bounding box before the circle
   * clipped its corners.
   *
   * The app icons are left alone: Android applies its own mask (that is what
   * `maskable-512` is for) and iOS its own rounded rectangle.
   */
  favicon?: boolean
}

const VARIANTS: Record<string, Variant> = {
  "icon-192.png": { size: 192, inset: 0.72 },
  "icon-512.png": { size: 512, inset: 0.72 },
  // Android crops maskable icons to a circle or squircle: the inner 80% is safe.
  "maskable-512.png": { size: 512, inset: 0.56, maskable: true },
  // iOS rounds the corners itself and wants an opaque square.
  "apple-touch-180.png": { size: 180, inset: 0.7 },
  // Android's status-bar badge: white on transparent, drawn from its alpha.
  "badge-96.png": { size: 96, inset: 0.8, badge: true },
  // The site favicon. Three sizes because browsers pick per context — 16/32
  // in a tab, 48 in a bookmark list, 96+ on a new-tab tile — and letting the
  // browser choose beats making it downscale one. `inset` is used only by
  // the monogram fallback; an upload is fitted to FAVICON_MARK_SHARE.
  "favicon-32.png": { size: 32, inset: 0.9, favicon: true },
  "favicon-48.png": { size: 48, inset: 0.9, favicon: true },
  "favicon-96.png": { size: 96, inset: 0.9, favicon: true },
}

/**
 * Share of the favicon's edge the mark's longer side is drawn to. The rest is
 * an even margin of background — the breathing room Sentry's and Supabase's
 * icons keep, and what stops a mark's tips touching the tab's edge.
 */
const FAVICON_MARK_SHARE = 0.9

/** Largest side the mark is located on; plenty for a 96px icon drawn at 4×. */
const BOUNDS_WORKING_SIZE = 1024
/**
 * How far (0–255, on any channel) a pixel must differ from the background to
 * count as part of the mark. Low enough to keep the faint, tapering tips of
 * a metallic mark; high enough to ignore a vignette or JPEG noise in the
 * backdrop, which is never flat black.
 */
const MARK_THRESHOLD = 28

type Rgb = { r: number; g: number; b: number }

/**
 * The favicon tile, cut from the upload itself: a square centred on the mark,
 * sized so the mark's longer side is FAVICON_MARK_SHARE of it.
 *
 * The mark is every pixel that is not background (for a transparent upload,
 * every visible pixel). Cutting the tile out of the upload — rather than
 * pasting the mark onto a flat square — keeps the upload's own backdrop,
 * vignette and shadow intact around it, so there is no seam where a lifted
 * mark meets a painted background. Where the square reaches past the upload's
 * edge it is extended with the background colour (or transparency).
 *
 * An upload with no distinguishable mark is returned whole.
 */
async function faviconTile(source: Buffer, background: Rgb | null): Promise<Buffer> {
  const working = await sharp(source, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize(BOUNDS_WORKING_SIZE, BOUNDS_WORKING_SIZE, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer()

  const { data, info } = await sharp(working).raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels
      const alpha = data[i + 3]!
      const isMark = background
        ? alpha > 0 &&
          Math.max(
            Math.abs(data[i]! - background.r),
            Math.abs(data[i + 1]! - background.g),
            Math.abs(data[i + 2]! - background.b)
          ) > MARK_THRESHOLD
        : alpha > MARK_THRESHOLD
      if (isMark) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }

  if (right < left || bottom < top) return working

  const side = Math.ceil(Math.max(right - left + 1, bottom - top + 1) / FAVICON_MARK_SHARE)
  const squareLeft = Math.round((left + right + 1) / 2 - side / 2)
  const squareTop = Math.round((top + bottom + 1) / 2 - side / 2)

  const pad = {
    left: Math.max(0, -squareLeft),
    top: Math.max(0, -squareTop),
    right: Math.max(0, squareLeft + side - width),
    bottom: Math.max(0, squareTop + side - height),
  }
  const fill = background ? { ...background, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 }

  const extended = await sharp(working).extend({ ...pad, background: fill }).png().toBuffer()
  return sharp(extended)
    .extract({ left: squareLeft + pad.left, top: squareTop + pad.top, width: side, height: side })
    .png()
    .toBuffer()
}

const MAX_SOURCE_BYTES = 6 * 1024 * 1024
const FETCH_TIMEOUT_MS = 5_000

const CACHE = "public, max-age=86400, stale-while-revalidate=604800"

function initials(name: string): string {
  const letters = name
    .split(/[\s-]+/)
    .filter((word) => /^[\p{L}\p{N}]/u.test(word))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("")
  return letters || "A"
}

/** Only our own storage — never an arbitrary URL. */
function isOwnStorageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return false
  try {
    const target = new URL(url)
    return target.origin === new URL(base).origin && target.pathname.startsWith("/storage/v1/object/public/")
  } catch {
    return false
  }
}

async function fetchImage(url: string | null): Promise<Buffer | null> {
  if (!url || !isOwnStorageUrl(url)) return null
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" })
    if (!response.ok) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    return bytes.length > 0 && bytes.length <= MAX_SOURCE_BYTES ? bytes : null
  } catch (error) {
    console.error("[app-icon] could not fetch branding image", error)
    return null
  }
}

/**
 * The artwork on a square background, as a PNG.
 *
 * An opaque upload (a square favicon on its own background, say) is given
 * its own corner colour as the backdrop and allowed to fill the icon — the
 * maskable one still keeps to Android's safe zone — so it never sits in a
 * visibly different frame. Artwork with transparency sits on the brand black
 * at the variant's inset.
 */
async function composite(source: Buffer, variant: Variant): Promise<Buffer> {
  const image = sharp(source, { limitInputPixels: 50_000_000 }).rotate()
  const { data } = await image.clone().ensureAlpha().extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true })
  const opaque = data[3] === 255
  const corner: Rgb = { r: data[0]!, g: data[1]!, b: data[2]! }
  const background = opaque ? { ...corner, alpha: 1 } : BACKGROUND

  // A favicon tile already carries its margin (faviconTile), so it fills the icon.
  const share = variant.favicon ? 1 : opaque ? (variant.maskable ? 0.8 : 1) : variant.inset
  const inner = Math.round(variant.size * share)

  /**
   * Small favicons are drawn large and then reduced.
   *
   * Resizing a logo straight down to 32px is where a mark turns to mush: the
   * detail lands between pixels. Compositing at 4× and reducing the finished
   * icon in one Lanczos step keeps the edges clean, which is the other half
   * of what the dealership meant by "optimise it to appear better".
   */
  const supersample = variant.favicon && variant.size < 128 ? 4 : 1
  const canvasSize = variant.size * supersample

  const artwork = await (variant.favicon ? sharp(await faviconTile(source, opaque ? corner : null)) : image)
    .resize(inner * supersample, inner * supersample, {
      fit: "contain",
      background: opaque ? background : { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  const layers: OverlayOptions[] = [{ input: artwork, gravity: "center" }]

  const composed = sharp({
    create: { width: canvasSize, height: canvasSize, channels: 4, background },
  }).composite(layers)

  return supersample > 1
    ? composed
        .png()
        .toBuffer()
        .then((buffer) =>
          sharp(buffer).resize(variant.size, variant.size, { kernel: "lanczos3" }).png().toBuffer()
        )
    : composed.png().toBuffer()
}

function monogram(name: string, variant: Variant): ImageResponse {
  const text = initials(name)
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: variant.badge ? "transparent" : BACKGROUND,
          color: variant.badge ? "#ffffff" : GOLD,
          fontSize: Math.round(variant.size * variant.inset * (text.length > 1 ? 0.5 : 0.66)),
          fontWeight: 700,
          letterSpacing: "0.04em",
          borderRadius: 0,
        }}
      >
        {text}
      </div>
    ),
    { width: variant.size, height: variant.size, headers: { "Cache-Control": CACHE } }
  )
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ variant: string }> }) {
  const { variant: key } = await params
  const variant = VARIANTS[key]
  if (!variant) return new NextResponse(null, { status: 404 })

  const settings = await getPublicSiteSettings()

  if (!variant.badge) {
    const { faviconUrl, logoDarkUrl, logoLightUrl } = settings.branding

    // The square favicon when it is big enough to stay sharp at this size,
    // else a logo, else whatever there is.
    const favicon = await fetchImage(faviconUrl)
    let source = favicon
    if (favicon) {
      const { width = 0 } = await sharp(favicon).metadata().catch(() => ({ width: 0 }))
      if (width < variant.size * variant.inset) {
        source = (await fetchImage(logoDarkUrl ?? logoLightUrl)) ?? favicon
      }
    } else {
      source = await fetchImage(logoDarkUrl ?? logoLightUrl)
    }

    if (source) {
      try {
        const png = await composite(source, variant)
        return new NextResponse(new Uint8Array(png), {
          headers: { "Content-Type": "image/png", "Cache-Control": CACHE },
        })
      } catch (error) {
        console.error("[app-icon] could not render branding image; using the monogram", error)
      }
    }
  }

  return monogram(settings.businessName, variant)
}
