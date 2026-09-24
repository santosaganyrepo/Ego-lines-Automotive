import * as Sentry from "@sentry/nextjs"
import { NextResponse, type NextRequest } from "next/server"

import { authorizePermission } from "@/lib/auth/admin-guard"
import { sentryDsn, sentryEnvironment } from "@/lib/monitoring/sentry-options"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Proves, from the live deployment, that server errors reach Sentry.
 *
 * `npm run sentry:test` checks the DSN from a developer's machine, where the
 * process waits for the send. It cannot check the deployment itself — which
 * variables Vercel actually has, and whether a report survives the function
 * being suspended after the response. This route runs inside the deployment:
 *
 *   /api/monitoring/verify                 a captured error, flushed, and the
 *                                          result reported back as JSON
 *   /api/monitoring/verify?mode=unhandled  an uncaught throw, the exact path
 *                                          a real failure takes (Next.js's
 *                                          onRequestError). The page shows a
 *                                          500; the event should appear in
 *                                          Sentry within a minute.
 *
 * Signed-in administrators with `settings:write` only. Nothing about the
 * DSN is returned, only whether one is configured. The events are tagged
 * `test: true` and titled so they are obvious under Issues.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizePermission("settings:write")
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.message },
      { status: auth.reason === "UNAUTHENTICATED" ? 401 : 403, headers: { "Cache-Control": "no-store" } }
    )
  }

  if (request.nextUrl.searchParams.get("mode") === "unhandled") {
    Sentry.setTag("test", "true")
    throw new Error("Sentry verification — unhandled server error (safe to resolve)")
  }

  const client = Sentry.getClient()
  const enabled = Boolean(client?.getOptions().enabled)
  const eventId = enabled
    ? Sentry.captureException(new Error("Sentry verification — handled server error (safe to resolve)"), {
        tags: { test: "true" },
      })
    : null
  const delivered = enabled ? await Sentry.flush(5_000) : false

  return NextResponse.json(
    {
      dsnConfigured: Boolean(sentryDsn()),
      enabled,
      environment: sentryEnvironment(),
      eventId,
      delivered,
      hint: enabled
        ? delivered
          ? "Sent. Look under Issues in Sentry for “Sentry verification”."
          : "Captured but not confirmed sent within 5 s. Check the deployment can reach sentry.io."
        : "Sentry is off in this deployment: set NEXT_PUBLIC_SENTRY_DSN in Vercel and redeploy.",
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
