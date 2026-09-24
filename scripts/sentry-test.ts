/**
 * Sends one test error to Sentry and reports whether Sentry accepted it.
 *
 *   npm run sentry:test
 *
 * Run it once after putting the DSN in place (in .env.local, or with the
 * variable exported in the shell) to prove the key is right before relying
 * on it. It uses the same options and the same privacy scrubbing as the
 * website (src/lib/monitoring/sentry-options.ts), so an event that arrives
 * here is exactly what the live site would send.
 *
 * The event is tagged `test: true` and titled "Sentry test event", so it is
 * easy to find — and to resolve — under Issues in Sentry.
 *
 * Exit code 0 means Sentry acknowledged the event; 1 means it did not, with
 * the reason printed. The DSN itself is never printed.
 */

import { config } from "dotenv"
import { existsSync } from "node:fs"

if (existsSync(".env.local")) {
  config({ path: ".env.local", quiet: true })
}

import * as Sentry from "@sentry/nextjs"

import { sentryDsn, sharedSentryOptions } from "../src/lib/monitoring/sentry-options"

async function main(): Promise<number> {
  const dsn = sentryDsn()
  if (!dsn) {
    console.error(
      "No valid Sentry DSN found. Set NEXT_PUBLIC_SENTRY_DSN (Sentry → Project settings → Client Keys (DSN)) " +
        "in .env.local or in this shell, then run again."
    )
    return 1
  }

  let transportError: string | null = null

  Sentry.init({
    ...sharedSentryOptions(),
    // The site only reports from production builds; this check must run anywhere.
    enabled: true,
    environment: process.env.SENTRY_TEST_ENVIRONMENT?.trim() || "sentry-test",
    tracesSampleRate: 0,
  })

  const client = Sentry.getClient()
  client?.on("afterSendEvent", (_event, response) => {
    const status = response?.statusCode
    if (status !== undefined && (status < 200 || status >= 300)) {
      transportError = `Sentry answered HTTP ${status}.`
    }
  })

  const eventId = Sentry.captureException(new Error("Sentry test event — safe to resolve"), {
    tags: { test: "true" },
  })

  const flushed = await Sentry.flush(10_000)
  if (!flushed) {
    console.error("Timed out sending to Sentry. Check this machine can reach sentry.io.")
    return 1
  }
  if (transportError) {
    console.error(`${transportError} The DSN is probably wrong or the project was deleted.`)
    return 1
  }

  console.log(`Sent. Sentry accepted event ${eventId}.`)
  console.log('Open Sentry → Issues and look for "Sentry test event — safe to resolve".')
  return 0
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error("The Sentry test could not run:", error)
    process.exit(1)
  }
)
