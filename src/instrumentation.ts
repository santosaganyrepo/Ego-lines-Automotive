import * as Sentry from "@sentry/nextjs"

/**
 * Next.js instrumentation hook: loads the Sentry SDK for whichever runtime is
 * starting, and reports every error Next.js catches while rendering a page or
 * running a route handler or Server Action (`onRequestError`).
 *
 * With no Sentry DSN configured the SDK is disabled and this costs nothing.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = Sentry.captureRequestError
