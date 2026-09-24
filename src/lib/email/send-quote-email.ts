import "server-only"

import { quoteEmailHtml } from "@/lib/email/quote-email-html"
import { sendEmail } from "@/lib/email/send-email"

/**
 * Sends a quotation email, through the shared `sendEmail`.
 *
 * Returns a sentence the dispatch dialog shows the operator, rather than
 * throwing: a failed send (bad address, provider outage, missing API key) is
 * an expected, recoverable outcome.
 */

export interface SendQuoteEmailAttachment {
  filename: string
  content: Buffer
}

export interface SendQuoteEmailInput {
  to: string
  subject: string
  /** Plain-text body — the same canonical text WhatsApp sends, so a
   *  customer who receives both reads the same figures either way. */
  text: string
  /** The rendered quotation PDF, attached when the operator has the
   *  "Attach PDF quotation" toggle on. Omitted for a text-only send. */
  attachment?: SendQuoteEmailAttachment
  /** The customer's "Accept quotation" page — shown as the email's main button. */
  acceptUrl?: string | null
  /** The secure PDF link — shown as a secondary button beside it. */
  pdfUrl?: string | null
  idempotencyKey?: string
}

export type SendQuoteEmailResult = { ok: true } | { ok: false; error: string }

export async function sendQuoteEmail(input: SendQuoteEmailInput): Promise<SendQuoteEmailResult> {
  const result = await sendEmail({
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: quoteEmailHtml(input.text, { acceptUrl: input.acceptUrl ?? null, pdfUrl: input.pdfUrl ?? null }),
    attachments: input.attachment ? [input.attachment] : undefined,
    idempotencyKey: input.idempotencyKey,
  })

  if (result.ok) {
    return { ok: true }
  }

  return {
    ok: false,
    error:
      result.reason === "NOT_CONFIGURED"
        ? "Email sending isn't configured yet. Add RESEND_API_KEY (see .env.example) to send quotations by email, or send this one over WhatsApp instead."
        : "Could not send the email. Please try again shortly.",
  }
}
