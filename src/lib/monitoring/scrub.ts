/**
 * Privacy scrubbing for error reports (SECURITY.MD §38, §20).
 *
 * Every event sent to Sentry — from the browser, the server or the edge —
 * passes through `scrubEvent` first. Errors in this application can carry
 * customer details: a Prisma validation message echoes the values it was
 * given, a URL can hold a tracking number or a quotation link's token, and a
 * request carries cookies. None of that may leave the deployment, so it is
 * removed here rather than trusted to be absent.
 *
 * Pure and dependency-free: shared by every Sentry runtime and unit-tested.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
// International and local phone numbers: 8–15 digits with the usual separators.
const PHONE = /\+?\d[\d\s().-]{6,}\d/g
// A customer's private quotation link.
const QUOTATION_TOKEN = /(\/quotation\/|\/api\/quotations\/)[A-Za-z0-9_-]{8,}/g
// Bearer tokens, API keys and JWTs that end up in a message.
const BEARER = /\b(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g
const SECRET_KEY = /\b(sb_secret_|sb_publishable_|re_|sk_(live|test)_)[A-Za-z0-9_-]{8,}/g

/** Redacts personal data and credentials from a piece of text. */
export function scrubText(text: string): string {
  return text
    .replace(QUOTATION_TOKEN, "$1[token]")
    .replace(BEARER, "$1[redacted]")
    .replace(JWT, "[jwt]")
    .replace(SECRET_KEY, "[secret]")
    .replace(EMAIL, "[email]")
    .replace(PHONE, (match) => (match.replace(/\D/g, "").length >= 8 ? "[phone]" : match))
}

/** A URL without its query string or fragment (tracking numbers and search terms live there). */
export function scrubUrl(url: string): string {
  const cut = url.search(/[?#]/)
  return scrubText(cut === -1 ? url : url.slice(0, cut))
}

function scrubUnknown(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]"
  if (typeof value === "string") return scrubText(value)
  if (Array.isArray(value)) return value.map((item) => scrubUnknown(item, depth + 1))
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        /password|secret|token|authorization|cookie|p256dh|auth$|endpoint/i.test(key) ? "[redacted]" : scrubUnknown(item, depth + 1),
      ])
    )
  }
  return value
}

/** The subset of a Sentry event this touches — structural, so the SDK types are not needed here. */
export interface ScrubbableEvent {
  message?: string
  request?: {
    url?: string
    query_string?: unknown
    cookies?: unknown
    headers?: Record<string, string>
    data?: unknown
  }
  user?: Record<string, unknown>
  exception?: { values?: { value?: string }[] }
  breadcrumbs?: { message?: string; data?: Record<string, unknown> }[]
  extra?: Record<string, unknown>
  contexts?: Record<string, unknown>
  tags?: Record<string, unknown>
}

const KEPT_HEADERS = new Set(["user-agent", "referer", "content-type", "accept-language"])

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.message) event.message = scrubText(event.message)

  if (event.request) {
    if (event.request.url) event.request.url = scrubUrl(event.request.url)
    delete event.request.query_string
    delete event.request.cookies
    // Form bodies are customer input (names, phones, notes).
    delete event.request.data
    if (event.request.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers)
          .filter(([name]) => KEPT_HEADERS.has(name.toLowerCase()))
          .map(([name, value]) => [name, name.toLowerCase() === "referer" ? scrubUrl(value) : value])
      )
    }
  }

  // Never an IP address, email or username — at most an opaque id.
  if (event.user) event.user = event.user.id ? { id: event.user.id } : {}

  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubText(exception.value)
  }

  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message)
    if (breadcrumb.data) {
      const data = { ...breadcrumb.data }
      for (const key of ["url", "from", "to"]) {
        if (typeof data[key] === "string") data[key] = scrubUrl(data[key] as string)
      }
      breadcrumb.data = scrubUnknown(data) as Record<string, unknown>
    }
  }

  if (event.extra) event.extra = scrubUnknown(event.extra) as Record<string, unknown>
  if (event.contexts) event.contexts = scrubUnknown(event.contexts) as Record<string, unknown>

  return event
}
