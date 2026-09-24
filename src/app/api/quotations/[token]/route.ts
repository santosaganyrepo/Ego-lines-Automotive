import { NextResponse, type NextRequest } from "next/server"

import {
  QUOTATION_PDF_MAX_PER_IP,
  QUOTATION_PDF_WINDOW_MS,
  RATE_LIMIT_SCOPES,
  consumeRateLimit,
} from "@/lib/auth/rate-limit"
import { getClientIp } from "@/lib/auth/client-ip"
import { siteConfig } from "@/config/site"
import { getQuoteForAcceptance } from "@/lib/queries/quote.queries"
import { quoteAcceptanceState, quoteAcceptanceUrl } from "@/lib/quotes/quote-acceptance"
import { buildQuotePdfData, buildQuotationFilename } from "@/lib/pdf/quote-pdf-data"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"
import { renderQuotePdfBuffer } from "@/lib/pdf/render-quote-pdf"

/**
 * The customer's secure link to their quotation PDF: `/quotation/<token>`
 * from the dispatch message resolves here (see next.config.ts's rewrite —
 * the file lives under `/api` so it can run the Node PDF renderer, which an
 * Edge runtime cannot).
 *
 * ── The security model ─────────────────────────────────────────────────
 * `token` is `Quote.shareToken` — 256 random bits, a bearer credential for
 * this one document and nothing else (see the schema documentation on
 * `Quote.shareToken`). There is no admin session and no customer account
 * involved: possession of the token *is* the authorization. It reaches
 * exactly one query (`getQuoteForAcceptance`), which selects only the fields a
 * customer's own quotation may show them — never `adminNotes`, the customer
 * record, or the linked order.
 *
 * The PDF is regenerated on every request rather than cached or stored,
 * which keeps it consistent with `isQuoteEditable`: a quote still in SENT can
 * be revised, and a stored file would silently go stale the moment it was.
 *
 * `runtime = "nodejs"` is required, not a default: `@react-pdf/renderer` uses
 * Node APIs (`fontkit`/`Buffer`) an Edge runtime does not provide.
 */
export const runtime = "nodejs"

/**
 * What a customer sees when the link cannot produce their PDF — a small,
 * self-contained page rather than a bare line of text, since they arrive here
 * from WhatsApp or an email and need a way back. No scripts, no external
 * assets; the only dynamic value (the business name, set by an administrator)
 * is escaped.
 */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c)
}

async function failurePage(status: number, title: string, message: string, headers?: Record<string, string>) {
  let businessName = "Quotation"
  try {
    businessName = (await getPublicSiteSettings()).businessName
  } catch (error) {
    console.error("[quotation-pdf] could not read settings for the failure page", error)
  }

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} | ${escapeHtml(businessName)}</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1c1b19;color:#f7f6f3;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}
main{max-width:28rem}p.brand{color:#e8b93a;font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:600;margin:0 0 16px}
h1{font-size:28px;line-height:1.2;margin:0 0 12px}p{margin:0 0 24px;color:#c9c6bf}
a{display:inline-flex;align-items:center;min-height:44px;padding:0 20px;border-radius:8px;margin:0 8px 8px 0;font-weight:600;text-decoration:none}
a.primary{background:#e8b93a;color:#1c1b19}a.secondary{border:1px solid rgba(255,255,255,.3);color:#f7f6f3}
a:focus-visible{outline:2px solid #e8b93a;outline-offset:2px}
</style></head><body><main><p class="brand">${escapeHtml(businessName)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a class="primary" href="/contact">Contact us</a><a class="secondary" href="/">Go to the website</a></main></body></html>`

  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...headers },
  })
}

const NOT_FOUND = {
  title: "This quotation link is not valid",
  message: "The link may have been mistyped, or the quotation may have been withdrawn. Contact us and we will send you a new link.",
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // The share token is always 43 base64url characters (256 bits). Anything
  // shorter or oddly shaped is not a token this application ever issued, so
  // it is refused before it reaches the database at all.
  if (!token || !/^[A-Za-z0-9_-]{20,128}$/.test(token)) {
    return failurePage(404, NOT_FOUND.title, NOT_FOUND.message)
  }

  const ip = await getClientIp()

  if (ip) {
    const verdict = await consumeRateLimit(
      [{ key: { scope: RATE_LIMIT_SCOPES.quotationPdfIp, identifier: ip }, max: QUOTATION_PDF_MAX_PER_IP }],
      QUOTATION_PDF_WINDOW_MS
    )

    if (!verdict.allowed) {
      return failurePage(
        429,
        "Please try again in a few minutes",
        "This link has been opened many times in a short period. Wait a few minutes and open it again.",
        { "Retry-After": "300" }
      )
    }
  }

  const found = await getQuoteForAcceptance(token)

  if (!found) {
    return failurePage(404, NOT_FOUND.title, NOT_FOUND.message)
  }

  const quote = found.document
  // The "Accept quotation" button is printed only while there is something
  // to accept; an accepted or ordered quotation's PDF is just the document.
  const acceptUrl =
    quoteAcceptanceState({
      status: found.status,
      customerAcceptedAt: found.customerAcceptedAt,
      validUntil: quote.validUntil,
    }) === "OPEN"
      ? quoteAcceptanceUrl(siteConfig.url, token)
      : null

  let buffer: Buffer

  try {
    buffer = await renderQuotePdfBuffer(buildQuotePdfData(quote, (await getPublicSiteSettings()).businessName), {
      acceptUrl,
    })
  } catch (error) {
    console.error("[quotation-pdf] failed to render PDF", error)
    return failurePage(
      500,
      "We could not prepare your quotation",
      "Your quotation is safe, but the document could not be generated just now. Please open the link again in a moment."
    )
  }

  const filename = buildQuotationFilename(quote.quoteNumber, quote.contactName ?? "Customer")

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      // A quotation carries a customer's name, contact details and a price —
      // it must never be cached by a shared proxy or CDN, only (at most) by
      // the requesting browser for the duration of that one view.
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  })
}
