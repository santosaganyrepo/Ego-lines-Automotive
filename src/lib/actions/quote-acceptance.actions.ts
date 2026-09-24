"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"

import { QuoteStatus } from "@/generated/prisma/enums"
import { getClientIp } from "@/lib/auth/client-ip"
import {
  QUOTE_ACCEPT_MAX_PER_IP,
  QUOTE_ACCEPT_WINDOW_MS,
  RATE_LIMIT_SCOPES,
  consumeRateLimit,
} from "@/lib/auth/rate-limit"
import { ADMIN_BASE_PATH } from "@/lib/constants/admin-routes"
import { notifyAdminsOfQuoteAcceptance, notifyCustomerQuoteAccepted } from "@/lib/email/notifications"
import { buildQuotePdfData } from "@/lib/pdf/quote-pdf-data"
import { prisma } from "@/lib/prisma"
import { pushQuoteAccepted } from "@/lib/push/admin-alerts"
import { getQuoteForAcceptance } from "@/lib/queries/quote.queries"
import {
  ACCEPTANCE_NOTE_MAX_LENGTH,
  SHARE_TOKEN_PATTERN,
  quoteAcceptancePath,
  quoteAcceptanceFingerprint,
  quoteAcceptanceState,
} from "@/lib/quotes/quote-acceptance"

/**
 * The customer's "Accept quotation" button, on /quotation/<token>/accept.
 *
 * ── Who may call it ──────────────────────────────────────────────────────
 * Nobody signs in. Possession of the quotation's share token is the
 * authorisation, exactly as for the PDF it accompanies — 256 random bits, and
 * it reaches this one quote and nothing else. Submissions are limited per
 * host, the token's shape is checked before any query, and a failure reads
 * the same whether the token was never valid or the quote is closed.
 *
 * ── What it does ─────────────────────────────────────────────────────────
 * In one transaction, with the quote row locked so an operator's edit or a
 * second press cannot interleave: re-reads the quotation, refuses if it is
 * not open (see quoteAcceptanceState) or if its figures no longer match the
 * fingerprint the customer's page was rendered with, then moves it to
 * ACCEPTED with the time, the total they saw and their optional message.
 * The order is not created here — see quote-acceptance.ts for why.
 *
 * After the commit, and without delaying the customer's page: a push
 * notification and an email to the administrators, and a confirmation email
 * to the customer. The dashboard's live watcher picks it up on its next poll.
 *
 * Pressing it twice is harmless: an already-accepted quote answers as
 * accepted and nothing is written or sent again.
 */

export interface QuoteAcceptanceFormState {
  status: "idle" | "accepted" | "error"
  message?: string
  /** The figures changed after the page was opened; the page must reload to show them. */
  stale?: boolean
}

const acceptanceSchema = z.object({
  token: z.string().regex(SHARE_TOKEN_PATTERN),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  note: z
    .string()
    .trim()
    .max(ACCEPTANCE_NOTE_MAX_LENGTH, `Please keep your message under ${ACCEPTANCE_NOTE_MAX_LENGTH} characters.`)
    .transform((value) => (value.length > 0 ? value : null)),
})

const NOT_OPEN =
  "This quotation can no longer be accepted online. Please contact us on WhatsApp or by email and we will help you straight away."

type Outcome =
  | { kind: "ACCEPTED"; quoteId: string; quoteNumber: string; total: number; contactEmail: string | null; contactName: string }
  | { kind: "ALREADY_ACCEPTED" }
  | { kind: "STALE" }
  | { kind: "NOT_OPEN"; reason: string }

export async function acceptQuoteAction(
  _previous: QuoteAcceptanceFormState,
  formData: FormData
): Promise<QuoteAcceptanceFormState> {
  const parsed = acceptanceSchema.safeParse({
    token: formData.get("token"),
    fingerprint: formData.get("fingerprint"),
    note: formData.get("note") ?? "",
  })

  if (!parsed.success) {
    const noteIssue = parsed.error.issues.find((issue) => issue.path[0] === "note")
    return { status: "error", message: noteIssue?.message ?? NOT_OPEN }
  }

  const { token, fingerprint, note } = parsed.data

  const ip = await getClientIp()
  if (ip) {
    const verdict = await consumeRateLimit(
      [{ key: { scope: RATE_LIMIT_SCOPES.quoteAcceptIp, identifier: ip }, max: QUOTE_ACCEPT_MAX_PER_IP }],
      QUOTE_ACCEPT_WINDOW_MS
    )
    if (!verdict.allowed) {
      return {
        status: "error",
        message: "Too many attempts from this connection. Please wait a few minutes, or message us on WhatsApp.",
      }
    }
  }

  let outcome: Outcome
  try {
    outcome = await prisma.$transaction(async (tx) => {
      // Lock the quote and its lines: an operator's revision (or a second
      // press of the button) waits for this to finish, or this waits for it
      // and then sees the new figures.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Quote" WHERE "shareToken" = ${token} FOR UPDATE`
      const quoteId = locked[0]?.id
      if (!quoteId) return { kind: "NOT_OPEN", reason: "not_found" } satisfies Outcome
      await tx.$queryRaw`SELECT "id" FROM "QuoteItem" WHERE "quoteId" = ${quoteId} FOR UPDATE`

      const quote = await getQuoteForAcceptance(token, tx)
      if (!quote) return { kind: "NOT_OPEN", reason: "not_shareable" } satisfies Outcome

      const state = quoteAcceptanceState({
        status: quote.status,
        customerAcceptedAt: quote.customerAcceptedAt,
        validUntil: quote.document.validUntil,
      })
      if (state === "ACCEPTED_BY_CUSTOMER") return { kind: "ALREADY_ACCEPTED" } satisfies Outcome
      if (state !== "OPEN") return { kind: "NOT_OPEN", reason: state } satisfies Outcome

      // The business name is not part of the fingerprint, so it is not read here.
      const shown = buildQuotePdfData(quote.document, "")
      if (quoteAcceptanceFingerprint(shown) !== fingerprint) return { kind: "STALE" } satisfies Outcome

      const acceptedAt = new Date()
      await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: QuoteStatus.ACCEPTED,
          customerAcceptedAt: acceptedAt,
          customerAcceptedTotal: shown.total,
          customerAcceptanceNote: note,
        },
      })

      return {
        kind: "ACCEPTED",
        quoteId: quote.id,
        quoteNumber: quote.document.quoteNumber,
        total: shown.total,
        contactEmail: quote.document.contactEmail,
        contactName: quote.document.contactName ?? "Customer",
      } satisfies Outcome
    })
  } catch (error) {
    console.error("[quote-acceptance] could not record an acceptance", error)
    return {
      status: "error",
      message: "We could not record your acceptance just now. Please try again in a moment, or message us on WhatsApp.",
    }
  }

  switch (outcome.kind) {
    case "ALREADY_ACCEPTED":
      return { status: "accepted" }
    case "STALE":
      return {
        status: "error",
        stale: true,
        message:
          "This quotation was updated after you opened it. The page has been refreshed with the latest figures — please check them before accepting.",
      }
    case "NOT_OPEN":
      console.warn("[quote-acceptance] refused", { reason: outcome.reason })
      return { status: "error", message: NOT_OPEN }
    case "ACCEPTED":
      break
  }

  const accepted = outcome
  after(async () => {
    await Promise.all([
      pushQuoteAccepted({ quoteId: accepted.quoteId, quoteNumber: accepted.quoteNumber }),
      notifyAdminsOfQuoteAcceptance({
        quoteId: accepted.quoteId,
        quoteNumber: accepted.quoteNumber,
        contactName: accepted.contactName,
        total: accepted.total,
        note,
      }),
      notifyCustomerQuoteAccepted({
        to: accepted.contactEmail,
        customerName: accepted.contactName,
        quoteNumber: accepted.quoteNumber,
        total: accepted.total,
      }),
    ])
  })

  revalidatePath(quoteAcceptancePath(token))
  revalidatePath(`${ADMIN_BASE_PATH}/quotes`)
  revalidatePath(`${ADMIN_BASE_PATH}/quotes/${accepted.quoteId}`)

  return { status: "accepted" }
}
