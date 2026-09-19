import * as Sentry from "@sentry/nextjs"

import { sharedSentryOptions } from "@/lib/monitoring/sentry-options"

/**
 * Sentry on the Node.js server (pages, Server Actions, route handlers).
 *
 * Besides uncaught errors, `console.error` is captured: across this codebase
 * failures that must not break a request (an email that could not be sent, a
 * push that failed, a settings read that fell back) are caught and logged,
 * and those logs are exactly what an operator needs to see. Everything passes
 * through the privacy scrubber first (src/lib/monitoring/scrub.ts).
 */
Sentry.init({
  ...sharedSentryOptions(),
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
})
