import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Building2, ChevronDown, ShieldAlert } from "lucide-react"

import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Container } from "@/components/layout/container"
import { LegalBody } from "@/components/legal/legal-body"
import { LegalDocumentKind } from "@/generated/prisma/enums"
import { LEGAL_DOCUMENTS, legalDocumentMeta } from "@/lib/legal/legal-documents"
import { fillPlaceholders, sectionAnchor } from "@/lib/legal/legal-text"
import { legalPlaceholderValues } from "@/lib/legal/placeholder-values"
import { getPublicLegalDocument } from "@/lib/queries/legal.queries"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"
import { toTelHref } from "@/lib/utils/tel"

/**
 * The public page for one legal document — Terms of Sale, Terms of Use,
 * Privacy Policy or Payment Safety.
 *
 * Built for reading rather than for show: a single column at a comfortable
 * measure, numbered sections a customer can cite ("section 7"), a table of
 * contents that stays beside the text on a desktop and folds away on a phone,
 * and the company's registered details at the end — the facts a customer
 * checks before sending a deposit.
 */

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso))
}

export async function legalDocumentMetadata(kind: LegalDocumentKind): Promise<Metadata> {
  const [document, settings] = await Promise.all([getPublicLegalDocument(kind), getPublicSiteSettings()])
  const summary = fillPlaceholders(document.summary, legalPlaceholderValues(settings))

  return {
    title: document.title,
    description: summary.length > 158 ? `${summary.slice(0, 155).trimEnd()}…` : summary,
    alternates: { canonical: legalDocumentMeta(kind).path },
  }
}

export async function LegalDocumentPage({ kind }: { kind: LegalDocumentKind }) {
  const [document, settings] = await Promise.all([getPublicLegalDocument(kind), getPublicSiteSettings()])
  const values = legalPlaceholderValues(settings)
  const meta = legalDocumentMeta(kind)
  const isPaymentSafety = kind === LegalDocumentKind.PAYMENT_SAFETY

  const sections = document.sections.map((section, index) => {
    const heading = fillPlaceholders(section.heading, values)
    return { ...section, heading, number: index + 1, anchor: sectionAnchor(index + 1, heading) }
  })

  const company = settings.company
  const companyRows = [
    { label: "Registered name", value: company.legalName || settings.businessName },
    company.legalName && company.legalName !== settings.businessName
      ? { label: "Trading as", value: settings.businessName }
      : null,
    company.registrationNumber ? { label: "Registration number", value: company.registrationNumber } : null,
    company.taxNumber ? { label: "Tax identification number", value: company.taxNumber } : null,
    settings.contact.address ? { label: "Address", value: settings.contact.address } : null,
  ].filter((row) => row !== null)

  const related = LEGAL_DOCUMENTS.filter((other) => other.kind !== kind)

  return (
    <article className="bg-background text-foreground">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-sunken/40">
        <Container className="flex flex-col gap-6 py-12 md:py-16">
          <Breadcrumbs items={[{ label: meta.label }]} />

          <div className="flex max-w-3xl flex-col gap-4">
            <span className="eyebrow text-gold-ink">Legal</span>
            <h1 className="text-h1 text-balance">{document.title}</h1>
            {document.updatedAt ? (
              <p className="text-small text-muted-foreground">
                Last updated <time dateTime={document.updatedAt}>{formatDate(document.updatedAt)}</time>
              </p>
            ) : null}
          </div>

          {document.summary.trim() ? (
            isPaymentSafety ? (
              <div
                role="note"
                className="flex max-w-3xl gap-4 rounded-xl border border-gold-ink/40 bg-gold/10 p-5 sm:p-6"
              >
                <ShieldAlert aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-gold-ink" />
                <LegalBody
                  text={document.summary}
                  values={values}
                  className="text-body-lg leading-relaxed font-medium text-foreground"
                />
              </div>
            ) : (
              <LegalBody
                text={document.summary}
                values={values}
                className="max-w-3xl text-body-lg leading-relaxed text-muted-foreground"
              />
            )
          ) : null}
        </Container>
      </header>

      <Container className="py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          {/* ── Contents ─────────────────────────────────────────────── */}
          {sections.length > 1 ? (
            <nav aria-label="Contents" className="min-w-0 lg:sticky lg:top-[calc(var(--header-offset)+2rem)] lg:self-start">
              {/* A phone gets a collapsed list: sixteen headings above the
                  first word of the terms would push them off the screen. */}
              <details className="group rounded-xl border border-border bg-card lg:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-small font-semibold [&::-webkit-details-marker]:hidden">
                  Contents
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 text-muted-foreground transition-transform duration-fast group-open:rotate-180"
                  />
                </summary>
                <ContentsList sections={sections} className="border-t border-border px-4 py-3" />
              </details>

              <div className="hidden lg:block">
                <p className="eyebrow text-muted-foreground">On this page</p>
                <ContentsList sections={sections} className="mt-4 max-h-[calc(100vh-var(--header-offset)-8rem)] overflow-y-auto pr-2" />
              </div>
            </nav>
          ) : (
            <div aria-hidden="true" className="hidden lg:block" />
          )}

          {/* ── Sections ─────────────────────────────────────────────── */}
          <div className="flex max-w-[68ch] min-w-0 flex-col">
            {sections.length === 0 ? (
              <p className="text-body text-muted-foreground">
                This document is being updated. Please contact us if you need a copy in the meantime.
              </p>
            ) : (
              <ol className="flex flex-col divide-y divide-border">
                {sections.map((section) => (
                  <li
                    key={section.id}
                    id={section.anchor}
                    className="flex scroll-mt-[calc(var(--header-offset)+1.5rem)] flex-col gap-4 py-9 first:pt-0"
                  >
                    <h2 className="flex items-baseline gap-3 font-heading text-h3 text-balance">
                      <span aria-hidden="true" className="text-gold-ink tabular-nums">
                        {section.number}.
                      </span>
                      <span>{section.heading}</span>
                    </h2>
                    <LegalBody text={section.body} values={values} />
                  </li>
                ))}
              </ol>
            )}

            {/* ── The company behind the site ──────────────────────── */}
            <section
              aria-labelledby="company-details"
              className="mt-10 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-subtle)] sm:p-8"
            >
              <h2 id="company-details" className="flex items-center gap-3 font-heading text-h3">
                <Building2 aria-hidden="true" className="size-5 text-gold-ink" />
                Company details
              </h2>
              <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 text-small sm:grid-cols-2">
                {companyRows.map((row) => (
                  <div key={row.label} className="flex min-w-0 flex-col gap-1">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="font-medium break-words text-foreground">{row.value}</dd>
                  </div>
                ))}
                {settings.contact.phone ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="font-medium">
                      <a href={toTelHref(settings.contact.phone)} className="tabular hover:text-gold-ink hover:underline">
                        {settings.contact.phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {settings.contact.email ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium break-all">
                      <a href={`mailto:${settings.contact.email}`} className="hover:text-gold-ink hover:underline">
                        {settings.contact.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            {/* ── The other documents ──────────────────────────────── */}
            <nav aria-label="Other legal documents" className="mt-10">
              <p className="eyebrow text-muted-foreground">Related documents</p>
              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {related.map((other) => (
                  <li key={other.kind}>
                    <Link
                      href={other.path}
                      className="group/doc flex h-full min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-small font-semibold transition-colors duration-fast hover:border-gold-ink/50 hover:text-gold-ink"
                    >
                      {other.label}
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 shrink-0 transition-transform duration-fast ease-crownline group-hover/doc:translate-x-0.5"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </Container>
    </article>
  )
}

function ContentsList({
  sections,
  className,
}: {
  sections: { anchor: string; number: number; heading: string }[]
  className?: string
}) {
  return (
    <ol className={className}>
      {sections.map((section) => (
        <li key={section.anchor}>
          <a
            href={`#${section.anchor}`}
            className="flex min-h-9 items-baseline gap-2.5 py-1.5 text-small text-muted-foreground transition-colors duration-fast hover:text-foreground pointer-coarse:min-h-11"
          >
            <span className="w-5 shrink-0 text-right text-xs text-gold-ink tabular-nums">{section.number}</span>
            <span className="text-pretty">{section.heading}</span>
          </a>
        </li>
      ))}
    </ol>
  )
}
