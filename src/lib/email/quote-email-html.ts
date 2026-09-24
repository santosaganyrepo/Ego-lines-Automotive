import { escapeHtml, safeHttpUrl } from "@/lib/email/email-layout"

/**
 * The HTML body of a quotation email (sent by send-quote-email.ts). Pure, so
 * the escaping and the buttons are unit-tested
 * (tests/unit/quote-acceptance.test.ts).
 */

const INK = "#141414"
const GOLD = "#d9b04c"

function button(label: string, url: string, primary: boolean): string {
  const style = primary
    ? `background:${GOLD};color:${INK};border:1px solid ${GOLD};`
    : `background:#ffffff;color:${INK};border:1px solid #c9c5bc;`
  return `<a href="${escapeHtml(url)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;${style}">${escapeHtml(label)}</a>`
}

/**
 * The HTML body: the same plain-text message, as readable paragraphs, with
 * "Accept quotation" and "View quotation" as real buttons beneath it — the
 * text already carries both links, so a client that shows only text loses
 * nothing. Deliberately not a branded template — the PDF attachment already
 * carries the logo and layout; this is the envelope, not the document.
 */
export function quoteEmailHtml(text: string, links: { acceptUrl: string | null; pdfUrl: string | null }): string {
  const accept = links.acceptUrl ? safeHttpUrl(links.acceptUrl) : null
  const pdf = links.pdfUrl ? safeHttpUrl(links.pdfUrl) : null
  const buttons =
    accept || pdf
      ? `<div style="margin-top:24px;">${accept ? button("Accept quotation", accept, true) : ""}${pdf ? button("View quotation (PDF)", pdf, !accept) : ""}</div>` +
        (accept
          ? `<p style="margin:8px 0 0;font-size:13px;color:#6b6b6b;">Prefer to talk first? Just reply to this email or message us on WhatsApp.</p>`
          : "")
      : ""

  return `<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${INK};"><div style="white-space:pre-wrap;">${escapeHtml(text)}</div>${buttons}</div>`
}
