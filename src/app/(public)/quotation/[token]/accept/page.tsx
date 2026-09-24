import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle2, Clock3, FileText, Mail, PackageCheck } from "lucide-react"

import { QuoteAcceptForm } from "@/components/quotes/quote-accept-form"
import { WhatsAppGlyph } from "@/components/shared/whatsapp-glyph"
import { Button, buttonVariants } from "@/components/ui/button"
import { getClientIp } from "@/lib/auth/client-ip"
import {
  QUOTATION_PDF_MAX_PER_IP,
  QUOTATION_PDF_WINDOW_MS,
  RATE_LIMIT_SCOPES,
  consumeRateLimit,
} from "@/lib/auth/rate-limit"
import { buildQuotePdfData, type QuotePdfData } from "@/lib/pdf/quote-pdf-data"
import { getQuoteForAcceptance } from "@/lib/queries/quote.queries"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"
import {
  SHARE_TOKEN_PATTERN,
  quoteAcceptanceFingerprint,
  quoteAcceptanceState,
  type QuoteAcceptanceState,
} from "@/lib/quotes/quote-acceptance"
import { firstNameOf, formatQuoteDate } from "@/lib/quotes/quote-messages"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/format-currency"
import { buildQuotationWhatsAppMessage, buildWhatsAppUrl } from "@/lib/utils/whatsapp"

/**
 * The customer's quotation, with "Accept quotation" — the page the Accept
 * button in their WhatsApp message, email and PDF opens.
 *
 * The share token in the address is the only authorisation (see
 * quote-acceptance.actions.ts). The page shows exactly what the PDF shows,
 * from the same narrow read, and nothing the customer did not already have.
 * Accepting is one option among three: the same screen offers WhatsApp and
 * email, because some customers would rather say yes — or ask a question —
 * in their own words, and that must stay just as easy.
 *
 * Never indexed, never cached, and no referrer is sent from it, so the token
 * does not travel to WhatsApp or anywhere else a link here leads.
 */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Your quotation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default async function QuotationAcceptPage({ params }: PageProps<"/quotation/[token]/accept">) {
  const { token } = await params
  if (!SHARE_TOKEN_PATTERN.test(token)) notFound()

  const ip = await getClientIp()
  if (ip) {
    const verdict = await consumeRateLimit(
      [{ key: { scope: RATE_LIMIT_SCOPES.quotationPdfIp, identifier: ip }, max: QUOTATION_PDF_MAX_PER_IP }],
      QUOTATION_PDF_WINDOW_MS
    )
    if (!verdict.allowed) {
      return (
        <Shell eyebrow="Your quotation" title="Please try again in a few minutes">
          <p className="text-body text-muted-foreground">
            This link has been opened many times in a short period. Wait a few minutes and open it again.
          </p>
        </Shell>
      )
    }
  }

  const [quote, settings] = await Promise.all([getQuoteForAcceptance(token), getPublicSiteSettings()])
  const whatsappFor = (quoteNumber: string | null) =>
    buildWhatsAppUrl({
      phoneNumber: settings.contact.whatsappNumber,
      message: quoteNumber
        ? buildQuotationWhatsAppMessage({ siteName: settings.businessName, quoteNumber })
        : `Hello ${settings.businessName}, I need help with a quotation link.`,
    })

  if (!quote) {
    return (
      <Shell eyebrow="Your quotation" title="This quotation link is not valid">
        <p className="text-body text-muted-foreground">
          The link may have been mistyped, or the quotation may have been withdrawn or replaced. Message us and we
          will send you the right one.
        </p>
        <ContactOptions whatsappUrl={whatsappFor(null)} email={settings.contact.email} quoteNumber={null} />
      </Shell>
    )
  }

  const data = buildQuotePdfData(quote.document, settings.businessName)
  const state = quoteAcceptanceState({
    status: quote.status,
    customerAcceptedAt: quote.customerAcceptedAt,
    validUntil: data.validUntil,
  })
  const whatsappUrl = whatsappFor(data.quoteNumber)

  return (
    <Shell eyebrow={`Quotation ${data.quoteNumber}`} title={`${firstNameOf(data.customerName)}, here is your quotation`}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        <QuoteSummary data={data} pdfHref={`/quotation/${token}`} />

        <div className="flex flex-col gap-6 self-start">
          <section
            aria-labelledby="quote-answer"
            className="flex flex-col gap-5 rounded-2xl bg-card p-6 shadow-[var(--shadow-raised)] ring-1 ring-foreground/10 sm:p-8"
          >
            <AnswerPanel
              state={state}
              data={data}
              acceptedAt={quote.customerAcceptedAt}
              acceptedTotal={quote.customerAcceptedTotal}
              token={token}
            />
          </section>
          <ContactOptions whatsappUrl={whatsappUrl} email={settings.contact.email} quoteNumber={data.quoteNumber} />
        </div>
      </div>
    </Shell>
  )
}

function Shell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <>
      <section data-tone="dark" className="gold-ambient overflow-hidden bg-foreground text-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <span className="eyebrow text-gold">{eyebrow}</span>
          <h1 className="max-w-3xl text-h1">{title}</h1>
        </div>
      </section>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:py-16 lg:px-8">{children}</div>
    </>
  )
}

function QuoteSummary({ data, pdfHref }: { data: QuotePdfData; pdfHref: string }) {
  const items = data.lines.filter((line) => line.kind === "ITEM")
  const accessories = data.lines.filter((line) => line.kind === "ACCESSORY")
  const rows: { label: string; value: string }[] = []

  if (accessories.length > 0 || data.shippingCost !== null || data.clearingCost !== null || data.importDuty !== null || data.otherCostsAmount !== null || data.discount) {
    rows.push({ label: data.isVehicle ? "Vehicle" : "Items", value: formatCurrency(data.itemsSubtotal) })
    if (data.accessoriesTotal > 0) rows.push({ label: "Accessories & extras", value: formatCurrency(data.accessoriesTotal) })
    if (data.discount) rows.push({ label: data.discount.label, value: `−${formatCurrency(data.discount.amount)}` })
    if (data.shippingCost !== null) rows.push({ label: "Shipping", value: formatCurrency(data.shippingCost) })
    if (data.clearingCost !== null) rows.push({ label: "Clearing", value: formatCurrency(data.clearingCost) })
    if (data.importDuty !== null) rows.push({ label: "Import duty", value: formatCurrency(data.importDuty) })
    if (data.otherCostsAmount !== null) {
      rows.push({ label: data.otherCostsLabel ?? "Other costs", value: formatCurrency(data.otherCostsAmount) })
    }
  }

  return (
    <section aria-labelledby="quote-summary" className="flex flex-col gap-6">
      <h2 id="quote-summary" className="text-h3">
        What is quoted
      </h2>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {[...items, ...accessories].map((line, index) => (
          <li key={index} className="flex items-start justify-between gap-4 py-4">
            <span className="text-body">
              {line.quantity > 1 ? <span className="text-muted-foreground">{line.quantity} × </span> : null}
              {line.description}
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              {line.lineTotal === null ? "—" : formatCurrency(line.lineTotal)}
            </span>
          </li>
        ))}
      </ul>

      {rows.length > 0 ? (
        <dl className="flex flex-col gap-2 text-body">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
        <span className="text-h3">Total</span>
        <span className="text-h2 tabular-nums">{formatCurrency(data.total)}</span>
      </div>

      {data.validUntil ? (
        <p className="text-small text-muted-foreground">Valid until {formatQuoteDate(data.validUntil)}.</p>
      ) : null}

      <a
        href={pdfHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline" }), "self-start")}
      >
        <FileText aria-hidden="true" />
        View the full quotation (PDF)
      </a>
    </section>
  )
}

function AnswerPanel({
  state,
  data,
  acceptedAt,
  acceptedTotal,
  token,
}: {
  state: QuoteAcceptanceState
  data: QuotePdfData
  acceptedAt: Date | null
  acceptedTotal: number | null
  token: string
}) {
  switch (state) {
    case "OPEN":
      return (
        <>
          <h2 id="quote-answer" className="text-h3">
            Ready to go ahead?
          </h2>
          <QuoteAcceptForm
            token={token}
            fingerprint={quoteAcceptanceFingerprint(data)}
            total={formatCurrency(data.total)}
          />
        </>
      )
    case "ACCEPTED_BY_CUSTOMER":
      return (
        <Status icon={<CheckCircle2 className="size-6 text-success" aria-hidden="true" />} title="You have accepted this quotation">
          {acceptedAt ? `Accepted on ${formatQuoteDate(acceptedAt)}` : "Accepted"}
          {acceptedTotal !== null ? ` at ${formatCurrency(acceptedTotal)}` : ""}. Our team will confirm your order
          and send you the payment details.
        </Status>
      )
    case "ACCEPTED":
      return (
        <Status icon={<CheckCircle2 className="size-6 text-success" aria-hidden="true" />} title="This quotation has been accepted">
          Our team has your acceptance and will confirm your order and send you the payment details.
        </Status>
      )
    case "ORDERED":
      return (
        <Status icon={<PackageCheck className="size-6 text-success" aria-hidden="true" />} title="Your order is confirmed">
          This quotation has become an order. Check your email or WhatsApp for your order number and payment details.
        </Status>
      )
    case "EXPIRED":
      return (
        <Status icon={<Clock3 className="size-6 text-warning" aria-hidden="true" />} title="This quotation has expired">
          Prices and availability may have changed since it was issued. Message us and we will send you an updated
          quotation.
        </Status>
      )
    case "CLOSED":
      return (
        <Status icon={<Clock3 className="size-6 text-muted-foreground" aria-hidden="true" />} title="This quotation is not open right now">
          Message us and we will help you straight away.
        </Status>
      )
  }
}

function Status({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      {icon}
      <h2 id="quote-answer" className="text-h3">
        {title}
      </h2>
      <p className="text-body text-muted-foreground">{children}</p>
    </div>
  )
}

function ContactOptions({
  whatsappUrl,
  email,
  quoteNumber,
}: {
  whatsappUrl: string | null
  email: string
  quoteNumber: string | null
}) {
  if (!whatsappUrl && !email) return null
  const subject = quoteNumber ? `Quotation ${quoteNumber}` : "My quotation"

  return (
    <section aria-labelledby="quote-contact" className="flex flex-col gap-3">
      <h2 id="quote-contact" className="text-body font-semibold">
        Prefer to talk it through?
      </h2>
      <p className="text-small text-muted-foreground">
        Ask a question, suggest a change, or accept in your own words — whichever is easiest for you.
      </p>
      <div className="flex flex-wrap gap-3">
        {whatsappUrl ? (
          <Button render={<a href={whatsappUrl} target="_blank" rel="noopener noreferrer" />} variant="whatsapp">
            <WhatsAppGlyph className="size-4" />
            WhatsApp us
          </Button>
        ) : null}
        {email ? (
          <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`} className={buttonVariants({ variant: "outline" })}>
            <Mail aria-hidden="true" />
            Email us
          </a>
        ) : null}
      </div>
      {email ? <p className="text-small text-muted-foreground">{email}</p> : null}
      {quoteNumber ? null : (
        <Link href="/contact" className="text-small underline underline-offset-4">
          Other ways to contact us
        </Link>
      )}
    </section>
  )
}
