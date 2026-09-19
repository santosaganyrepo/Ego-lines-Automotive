import * as Sentry from "@sentry/nextjs"

import { sharedSentryOptions } from "@/lib/monitoring/sentry-options"

/**
 * Sentry in the browser: uncaught errors, unhandled promise rejections and
 * page-load/navigation performance.
 *
 * Session Replay is deliberately not enabled — the dashboard shows customers'
 * names, phone numbers and payments, and a screen recording of it is not
 * something to send to a third party. Events go through `/monitoring` on this
 * site (the tunnel route in next.config.ts), so ad-blockers do not drop them
 * and the Content-Security-Policy stays `connect-src 'self'`.
 */
Sentry.init(sharedSentryOptions())

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
