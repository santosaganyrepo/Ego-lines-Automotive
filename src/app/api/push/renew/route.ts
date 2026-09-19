import { NextResponse, type NextRequest } from "next/server"

import { getClientIp } from "@/lib/auth/client-ip"
import {
  PUSH_RENEW_MAX_PER_IP,
  PUSH_RENEW_WINDOW_MS,
  RATE_LIMIT_SCOPES,
  consumeRateLimit,
} from "@/lib/auth/rate-limit"
import { prisma } from "@/lib/prisma"
import { pushRenewalSchema } from "@/lib/validations/push.schema"

export const runtime = "nodejs"

/**
 * Called by the dashboard's service worker (public/sw.js) when the browser
 * replaces a push subscription on its own — the `pushsubscriptionchange`
 * event. The worker has no guarantee of a live session at that moment (the
 * app may have been closed for days), so this route cannot require one.
 *
 * What authorises the change instead is possession of the *old* endpoint: an
 * unguessable capability URL that only this server and that browser know.
 * The route moves an existing registration to the new endpoint and does
 * nothing else — it cannot create a registration, change its owner, or tell
 * the caller whether the old endpoint existed (every outcome is the same 204).
 *
 * JSON only: a cross-site form cannot send `application/json` without a CORS
 * preflight, which this route never approves.
 */
const DONE = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } })

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return new NextResponse(null, { status: 415 })
  }

  const ip = await getClientIp()
  if (ip) {
    const verdict = await consumeRateLimit(
      [{ key: { scope: RATE_LIMIT_SCOPES.pushRenewIp, identifier: ip }, max: PUSH_RENEW_MAX_PER_IP }],
      PUSH_RENEW_WINDOW_MS
    )
    if (!verdict.allowed) return new NextResponse(null, { status: 429, headers: { "Retry-After": "600" } })
  }

  let body: unknown
  try {
    // A subscription is well under 1KB; refuse anything that is not.
    const text = await request.text()
    if (text.length > 4096) return new NextResponse(null, { status: 413 })
    body = JSON.parse(text)
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const parsed = pushRenewalSchema.safeParse(body)
  if (!parsed.success) return new NextResponse(null, { status: 400 })

  const { oldEndpoint, subscription } = parsed.data
  if (oldEndpoint === subscription.endpoint) return DONE()

  try {
    await prisma.$transaction(async (tx) => {
      const previous = await tx.adminPushSubscription.findUnique({ where: { endpoint: oldEndpoint }, select: { id: true, adminId: true } })
      if (!previous) return

      const clash = await tx.adminPushSubscription.findUnique({ where: { endpoint: subscription.endpoint }, select: { adminId: true } })
      if (clash) {
        // The new endpoint is already registered (the dashboard got there
        // first); the old row is simply obsolete.
        await tx.adminPushSubscription.delete({ where: { id: previous.id } })
        return
      }

      await tx.adminPushSubscription.update({
        where: { id: previous.id },
        data: {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          failureCount: 0,
        },
      })
    })
  } catch (error) {
    console.error("[push] could not renew a subscription", error)
  }

  return DONE()
}
