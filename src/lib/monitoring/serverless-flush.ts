import * as Sentry from "@sentry/nextjs"

/**
 * Keeps a Vercel function alive until Sentry has sent what it captured.
 *
 * ── The bug this exists for ───────────────────────────────────────────────
 * Sentry queues an event and sends it in the background. On a long-running
 * server that is fine; on Vercel the function is suspended as soon as the
 * response is written, and a send still in flight is frozen with it and
 * usually never completes. `npm run sentry:test` worked because it awaits
 * `Sentry.flush()` itself; the live site lost its errors because nothing did.
 *
 * The SDK does try: `captureRequestError` asks the platform to wait for a
 * flush. But its Vercel helper (`vercelWaitUntil` in @sentry/core) returns
 * early unless the code is running in the *Edge* runtime — and every page,
 * Server Action and route handler here runs on Node.js. So on Vercel the
 * request finished, the function froze, and the report never left.
 *
 * ── The fix ───────────────────────────────────────────────────────────────
 * Vercel exposes the current request's `waitUntil` on this well-known
 * symbol in both runtimes; `@vercel/functions` and Next.js's own `after()`
 * read the same one. Handing it a flush keeps the function running (up to
 * the timeout below) until the event is delivered, without delaying the
 * response the visitor is waiting for. Anywhere else — `next start`, a
 * build, a test — the symbol is absent and this does nothing, which is
 * correct: a long-lived process sends on its own.
 */

const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context")

/** Long enough for a round trip to Sentry's EU ingest; short enough not to bill idle time. */
const FLUSH_TIMEOUT_MS = 2_000

interface VercelRequestContext {
  get?: () => { waitUntil?: (task: Promise<unknown>) => void } | undefined
}

function vercelWaitUntil(): ((task: Promise<unknown>) => void) | undefined {
  const store = (globalThis as { [VERCEL_REQUEST_CONTEXT]?: VercelRequestContext })[VERCEL_REQUEST_CONTEXT]
  return store?.get?.()?.waitUntil
}

/**
 * Registers the flush on the current Sentry client. Call once, straight
 * after `Sentry.init` on the server.
 *
 * Error events only: performance transactions are sampled and expendable,
 * and flushing for each would hold every traced request open.
 */
export function flushErrorsBeforeSuspend(): void {
  const client = Sentry.getClient()
  if (!client) return

  client.on("preprocessEvent", (event) => {
    // Error events have no `type`; transactions, feedback etc. do.
    if (event.type !== undefined) return
    const waitUntil = vercelWaitUntil()
    if (!waitUntil) return
    // `flush` resolves (to false) on timeout rather than rejecting.
    waitUntil(Sentry.flush(FLUSH_TIMEOUT_MS))
  })
}
