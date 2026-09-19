import { scrubEvent, scrubText, scrubUrl, type ScrubbableEvent } from "@/lib/monitoring/scrub"

/**
 * Settings shared by the browser, server and edge Sentry SDKs.
 *
 * Sentry only runs when a DSN is configured *and* this is a production build,
 * so development, tests and a deployment without Sentry keys send nothing.
 * The DSN is not a secret (it only allows sending events), which is why the
 * browser can use the NEXT_PUBLIC_ variable.
 */

export function sentryDsn(): string | undefined {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim()
  return dsn && /^https:\/\/[^@\s]+@[^/\s]+\/\d+$/.test(dsn) ? dsn : undefined
}

export function sentryEnvironment(): string {
  return process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || "production"
}

export function sharedSentryOptions() {
  const dsn = sentryDsn()
  return {
    dsn,
    enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
    environment: sentryEnvironment(),
    // Never attach IP addresses, cookies or request bodies automatically.
    sendDefaultPii: false,
    // A tenth of requests traced for performance; every error is still sent.
    tracesSampleRate: sentryEnvironment() === "production" ? 0.1 : 1,
    beforeSend<T extends ScrubbableEvent>(event: T): T {
      return scrubEvent(event)
    },
    beforeSendTransaction<T extends ScrubbableEvent & { transaction?: string }>(event: T): T {
      if (event.transaction) event.transaction = scrubUrl(event.transaction)
      return scrubEvent(event)
    },
    beforeBreadcrumb<B extends { message?: string; data?: Record<string, unknown> }>(breadcrumb: B): B {
      if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message)
      if (breadcrumb.data && typeof breadcrumb.data.url === "string") {
        breadcrumb.data = { ...breadcrumb.data, url: scrubUrl(breadcrumb.data.url) }
      }
      return breadcrumb
    },
  }
}
