import * as Sentry from "@sentry/nextjs"

import { flushErrorsBeforeSuspend } from "@/lib/monitoring/serverless-flush"
import { sharedSentryOptions } from "@/lib/monitoring/sentry-options"

/** Sentry in the edge runtime (the request proxy). Same privacy rules as the server. */
Sentry.init(sharedSentryOptions())

flushErrorsBeforeSuspend()
