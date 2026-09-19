/**
 * The small text format the legal documents are written in, and the
 * placeholders that keep them in step with Settings.
 *
 * ── Why not Markdown or HTML ──────────────────────────────────────────
 * The dealership edits these documents in a plain text box. A full Markdown
 * or rich-text editor would add a dependency and, with HTML, a stored-XSS
 * surface on the most-read pages of the site. What a legal document needs is
 * four things, so that is all this understands:
 *
 *   - a blank line starts a new paragraph;
 *   - a line starting "- " (or "• ") is a bullet;
 *   - a line starting "1. ", "2. " … is a numbered item;
 *   - **two asterisks** around words make them bold.
 *
 * Everything is returned as data and rendered by React, which escapes it, so
 * nothing typed here can become markup.
 *
 * Pure: no React, no server imports. Shared by the public pages, the admin
 * preview and the unit tests.
 */

/* ── Placeholders ──────────────────────────────────────────────────── */

/**
 * Values a document can refer to instead of repeating them. Each is read from
 * Settings when the page renders, so renaming the business or changing the
 * payment schedule updates every document at once.
 */
export interface LegalPlaceholderValues {
  businessName: string
  legalName: string
  website: string
  email: string
  phone: string
  whatsapp: string
  address: string
  initialPercent: number
  mombasaPercent: number
  finalPercent: number
}

export const LEGAL_PLACEHOLDERS = [
  { token: "company", description: "The registered company and trading name, e.g. “… Co. Ltd, trading as …” — or just the business name until a registered name is entered" },
  { token: "business_name", description: "The business name (Settings → Business information)" },
  { token: "legal_name", description: "The registered company name — or the business name until one is entered" },
  { token: "website", description: "The website address" },
  { token: "email", description: "The business email address" },
  { token: "phone", description: "The primary phone number" },
  { token: "whatsapp", description: "The WhatsApp number" },
  { token: "address", description: "The business address" },
  { token: "initial_payment", description: "The initial vehicle payment, e.g. 50%" },
  { token: "mombasa_payment", description: "The payment due at Mombasa, e.g. 25%" },
  { token: "final_payment", description: "The final payment before release, e.g. 25%" },
] as const

export type LegalPlaceholderToken = (typeof LEGAL_PLACEHOLDERS)[number]["token"]

function percent(value: number): string {
  return `${Number(value.toFixed(2))}%`
}

/**
 * The text each placeholder becomes. An unset contact detail becomes a
 * pointer to where the customer can find it, never an empty gap mid-sentence.
 */
export function placeholderText(values: LegalPlaceholderValues): Record<LegalPlaceholderToken, string> {
  const or = (value: string, fallback: string) => (value.trim() ? value.trim() : fallback)

  const legalName = values.legalName.trim()

  return {
    company:
      legalName && legalName !== values.businessName
        ? `${legalName}, trading as ${values.businessName}`
        : values.businessName,
    business_name: values.businessName,
    legal_name: or(values.legalName, values.businessName),
    website: values.website.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    email: or(values.email, "the email address shown on our Contact page"),
    phone: or(values.phone, "the telephone number shown on our Contact page"),
    whatsapp: or(values.whatsapp, "the WhatsApp number shown on our website"),
    address: or(values.address, "the address shown on our Contact page"),
    initial_payment: percent(values.initialPercent),
    mombasa_payment: percent(values.mombasaPercent),
    final_payment: percent(values.finalPercent),
  }
}

/**
 * Replaces `{{token}}` with its value. An unknown token is left exactly as
 * typed, so a misspelling is visible on the page rather than silently blank.
 */
export function fillPlaceholders(text: string, values: LegalPlaceholderValues): string {
  const table = placeholderText(values) as Record<string, string>

  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, token: string) => table[token] ?? match)
}

/* ── Blocks ────────────────────────────────────────────────────────── */

/** A run of text, bold or not. */
export interface LegalSpan {
  text: string
  bold: boolean
}

export type LegalBlock =
  | { kind: "paragraph"; spans: LegalSpan[] }
  | { kind: "bullets"; items: LegalSpan[][] }
  | { kind: "numbered"; items: LegalSpan[][] }

const BULLET = /^\s*(?:[-•*])\s+(.*)$/
const NUMBERED = /^\s*\d{1,3}[.)]\s+(.*)$/

/** Splits `**bold**` runs out of a line. An unpaired `**` stays literal. */
export function parseSpans(text: string): LegalSpan[] {
  const spans: LegalSpan[] = []
  const pattern = /\*\*(.+?)\*\*/g
  let last = 0

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) spans.push({ text: text.slice(last, index), bold: false })
    spans.push({ text: match[1], bold: true })
    last = index + match[0].length
  }

  if (last < text.length) spans.push({ text: text.slice(last), bold: false })

  return spans.length > 0 ? spans : [{ text: "", bold: false }]
}

/**
 * Turns a section body into paragraphs and lists.
 *
 * Consecutive plain lines join into one paragraph (a line break typed in the
 * middle of a sentence is not a new paragraph); a blank line ends it. A list
 * runs for as long as its lines keep the same marker.
 */
export function parseLegalBody(body: string): LegalBlock[] {
  const blocks: LegalBlock[] = []
  let paragraph: string[] = []
  let list: { kind: "bullets" | "numbered"; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", spans: parseSpans(paragraph.join(" ")) })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list) {
      blocks.push({ kind: list.kind, items: list.items.map(parseSpans) })
      list = null
    }
  }

  for (const rawLine of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim()

    if (line.length === 0) {
      flushParagraph()
      flushList()
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    const kind = bullet ? "bullets" : numbered ? "numbered" : null

    if (kind) {
      flushParagraph()
      if (list && list.kind !== kind) flushList()
      list ??= { kind, items: [] }
      list.items.push((bullet ?? numbered)![1].trim())
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()

  return blocks
}

/* ── Anchors ───────────────────────────────────────────────────────── */

/**
 * The in-page anchor for a section: its number and heading, e.g.
 * `7-vehicle-payment-schedule`. The number keeps two sections with the same
 * heading distinct.
 */
export function sectionAnchor(position: number, heading: string): string {
  const slug = heading
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  return slug ? `${position}-${slug}` : `section-${position}`
}
