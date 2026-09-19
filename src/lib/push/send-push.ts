import "server-only"

import webpush, { WebPushError } from "web-push"

import { prisma } from "@/lib/prisma"
import { isAllowedPushEndpoint } from "@/lib/push/push-endpoint"
import type { PushPayload } from "@/lib/push/push-payload"
import { vapidConfig } from "@/lib/push/push-config"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"

/**
 * Delivers a notification to administrators' devices.
 *
 * Called after the response (`after()`), never on a customer's critical
 * path, and never throws: a push that cannot be delivered is logged and the
 * business action it announces has already succeeded.
 *
 * A device the push service reports as gone (404/410), or that no longer
 * matches this server's keys (401/403), is removed at once — it will never
 * accept another delivery. Other failures (the service is down, a timeout)
 * are counted, and a device is only dropped after many in a row, so a bad
 * afternoon at a push service does not silently switch anyone's alerts off.
 */

export interface PushDeliveryResult {
  sent: number
  removed: number
  failed: number
}

/** A runaway count of devices is a bug or abuse, not a use case. */
const MAX_DEVICES_PER_ADMIN = 20
const MAX_CONSECUTIVE_FAILURES = 10
const SEND_TIMEOUT_MS = 10_000

export interface PushOptions {
  /** How long the push service keeps trying a device that is offline. */
  ttlSeconds: number
  urgency: "very-low" | "low" | "normal" | "high"
}

const EMPTY: PushDeliveryResult = { sent: 0, removed: 0, failed: 0 }

export async function sendPushToAdmins(
  target: { adminIds: readonly string[] } | { allActiveAdmins: true } | { endpoint: string; adminId: string },
  payload: PushPayload,
  options: PushOptions
): Promise<PushDeliveryResult> {
  try {
    const { contact } = await getPublicSiteSettings()
    const vapid = vapidConfig(contact.email)
    if (!vapid) return EMPTY

    const devices = await prisma.adminPushSubscription.findMany({
      where: {
        admin: { isActive: true },
        ...("endpoint" in target
          ? { endpoint: target.endpoint, adminId: target.adminId }
          : "adminIds" in target
            ? { adminId: { in: [...target.adminIds] } }
            : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, adminId: true, endpoint: true, p256dh: true, auth: true },
      take: 500,
    })

    // At most MAX_DEVICES_PER_ADMIN each, the most recently confirmed first.
    const perAdmin = new Map<string, number>()
    const recipients = devices.filter((device) => {
      const count = perAdmin.get(device.adminId) ?? 0
      perAdmin.set(device.adminId, count + 1)
      return count < MAX_DEVICES_PER_ADMIN && isAllowedPushEndpoint(device.endpoint)
    })

    if (recipients.length === 0) return EMPTY

    const body = JSON.stringify(payload)
    const outcomes = await Promise.all(
      recipients.map(async (device) => {
        try {
          await webpush.sendNotification(
            { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
            body,
            {
              vapidDetails: vapid,
              TTL: options.ttlSeconds,
              urgency: options.urgency,
              topic: payload.tag,
              timeout: SEND_TIMEOUT_MS,
            }
          )
          // updateMany: the device may have been switched off meanwhile.
          await prisma.adminPushSubscription.updateMany({
            where: { id: device.id },
            data: { lastSuccessAt: new Date(), failureCount: 0 },
          })
          return "sent" as const
        } catch (error) {
          return handleFailure(device.id, error)
        }
      })
    )

    return {
      sent: outcomes.filter((outcome) => outcome === "sent").length,
      removed: outcomes.filter((outcome) => outcome === "removed").length,
      failed: outcomes.filter((outcome) => outcome === "failed").length,
    }
  } catch (error) {
    console.error("[push] could not send notifications", error)
    return EMPTY
  }
}

/** 404/410: unsubscribed or expired. 401/403: signed with a different key pair. Neither will ever succeed again. */
const GONE_STATUSES = new Set([401, 403, 404, 410])

async function handleFailure(id: string, error: unknown): Promise<"removed" | "failed"> {
  const status = error instanceof WebPushError ? error.statusCode : null

  try {
    if (status !== null && GONE_STATUSES.has(status)) {
      await prisma.adminPushSubscription.deleteMany({ where: { id } })
      return "removed"
    }

    const updated = await prisma.adminPushSubscription.update({
      where: { id },
      data: { failureCount: { increment: 1 } },
      select: { failureCount: true },
    })
    if (updated.failureCount >= MAX_CONSECUTIVE_FAILURES) {
      await prisma.adminPushSubscription.deleteMany({ where: { id } })
      console.warn(`[push] removed a device after ${MAX_CONSECUTIVE_FAILURES} consecutive failed deliveries`)
      return "removed"
    }
  } catch (bookkeeping) {
    // The row may have gone meanwhile (the device was switched off); nothing to fix.
    console.error("[push] could not record a failed delivery", bookkeeping)
  }

  // The endpoint is a capability URL: log the status, never the address.
  console.error(`[push] delivery failed${status ? ` with status ${status}` : ""}`, status ? "" : error)
  return "failed"
}
