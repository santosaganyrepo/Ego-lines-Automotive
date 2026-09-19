"use server"

import { recordAuditLogBestEffort } from "@/lib/audit"
import { authorizeAdmin } from "@/lib/auth/admin-guard"
import { currentDeviceLabel } from "@/lib/auth/admin-sessions"
import {
  PUSH_TEST_MAX_PER_ADMIN,
  PUSH_TEST_WINDOW_MS,
  RATE_LIMIT_SCOPES,
  consumeRateLimit,
} from "@/lib/auth/rate-limit"
import { prisma } from "@/lib/prisma"
import { isPushConfigured } from "@/lib/push/push-config"
import { buildPushPayload } from "@/lib/push/push-payload"
import { sendPushToAdmins } from "@/lib/push/send-push"
import { pushDeviceRefSchema, pushEndpointSchema, pushSubscriptionSchema } from "@/lib/validations/push.schema"

/**
 * Push notifications for *this* device — the per-device switch under
 * Settings → Notifications.
 *
 * Each export is a public POST endpoint: input is validated (including the
 * push-service allowlist that stops the server being pointed at arbitrary
 * URLs), then a fully signed-in administrator is required, and every lookup
 * is scoped to that administrator. A device can only ever be registered to,
 * tested by or removed by the administrator currently signed in on it.
 */

export type PushActionResult = { ok: true; message?: string } | { ok: false; message: string }

const MAX_DEVICES_PER_ADMIN = 20

function notConfigured(): PushActionResult {
  return { ok: false, message: "Push notifications are not set up on the server yet." }
}

/** Switches notifications on for the device this request comes from. */
export async function savePushSubscriptionAction(input: unknown): Promise<PushActionResult> {
  const parsed = pushSubscriptionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "That subscription is not valid." }

  const auth = await authorizeAdmin()
  if (!auth.ok) return { ok: false, message: auth.message }
  if (!isPushConfigured()) return notConfigured()

  const { endpoint, keys } = parsed.data
  const deviceLabel = await currentDeviceLabel()

  try {
    const added = await prisma.$transaction(async (tx) => {
      const existing = await tx.adminPushSubscription.findUnique({ where: { endpoint }, select: { adminId: true } })

      await tx.adminPushSubscription.upsert({
        where: { endpoint },
        // A browser handed from one administrator to another keeps its
        // endpoint; the row follows whoever switched it on last.
        update: { adminId: auth.admin.id, adminSessionId: auth.session.id, p256dh: keys.p256dh, auth: keys.auth, deviceLabel, failureCount: 0 },
        create: { adminId: auth.admin.id, adminSessionId: auth.session.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, deviceLabel },
      })

      // Oldest devices beyond the cap are dropped, never the one just added.
      const surplus = await tx.adminPushSubscription.findMany({
        where: { adminId: auth.admin.id },
        orderBy: { updatedAt: "desc" },
        skip: MAX_DEVICES_PER_ADMIN,
        select: { id: true },
      })
      if (surplus.length > 0) {
        await tx.adminPushSubscription.deleteMany({ where: { id: { in: surplus.map((row) => row.id) } } })
      }

      return existing?.adminId !== auth.admin.id
    })

    if (added) {
      await recordAuditLogBestEffort({
        actorId: auth.admin.id,
        action: "ADMIN_PUSH_DEVICE_ADDED",
        entityType: "AdminProfile",
        entityId: auth.admin.id,
        metadata: { device: deviceLabel ?? "Unknown device" },
      })
    }

    return { ok: true, message: "Notifications are on for this device." }
  } catch (error) {
    console.error("[push] could not save a subscription", error)
    return { ok: false, message: "Could not turn notifications on. Please try again." }
  }
}

/** Switches notifications off for this device. */
export async function removePushSubscriptionAction(input: unknown): Promise<PushActionResult> {
  const parsed = pushEndpointSchema.safeParse(input)
  if (!parsed.success) return { ok: true } // nothing this server could hold

  const auth = await authorizeAdmin()
  if (!auth.ok) return { ok: false, message: auth.message }

  try {
    const removed = await prisma.adminPushSubscription.deleteMany({
      where: { endpoint: parsed.data.endpoint, adminId: auth.admin.id },
    })

    if (removed.count > 0) {
      await recordAuditLogBestEffort({
        actorId: auth.admin.id,
        action: "ADMIN_PUSH_DEVICE_REMOVED",
        entityType: "AdminProfile",
        entityId: auth.admin.id,
        metadata: { device: (await currentDeviceLabel()) ?? "Unknown device" },
      })
    }

    return { ok: true, message: "Notifications are off for this device." }
  } catch (error) {
    console.error("[push] could not remove a subscription", error)
    return { ok: false, message: "Could not turn notifications off. Please try again." }
  }
}

/** Removes another of this administrator's devices, from the device list. */
export async function removePushDeviceAction(input: unknown): Promise<PushActionResult> {
  const parsed = pushDeviceRefSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "That device could not be found." }
  const { deviceId } = parsed.data

  const auth = await authorizeAdmin()
  if (!auth.ok) return { ok: false, message: auth.message }

  try {
    const removed = await prisma.adminPushSubscription.deleteMany({ where: { id: deviceId, adminId: auth.admin.id } })
    if (removed.count > 0) {
      await recordAuditLogBestEffort({
        actorId: auth.admin.id,
        action: "ADMIN_PUSH_DEVICE_REMOVED",
        entityType: "AdminProfile",
        entityId: auth.admin.id,
      })
    }
    return { ok: true, message: "That device will no longer receive notifications." }
  } catch (error) {
    console.error("[push] could not remove a device", error)
    return { ok: false, message: "Could not remove that device. Please try again." }
  }
}

/**
 * Called whenever the dashboard opens: is this browser's subscription one this
 * administrator switched on?
 *
 * It also keeps the device tied to the session in use now, so signing out
 * here later removes it (see forgetPushDevices in admin-sessions.ts). A
 * subscription left by a *different* administrator on this browser is
 * removed: their alerts must not appear on a device someone else now uses.
 */
export async function syncPushSubscriptionAction(input: unknown): Promise<{ registered: boolean }> {
  const parsed = pushEndpointSchema.safeParse(input)
  if (!parsed.success) return { registered: false }

  const auth = await authorizeAdmin()
  if (!auth.ok) return { registered: false }

  try {
    const row = await prisma.adminPushSubscription.findUnique({
      where: { endpoint: parsed.data.endpoint },
      select: { id: true, adminId: true, adminSessionId: true },
    })
    if (!row) return { registered: false }

    if (row.adminId !== auth.admin.id) {
      await prisma.adminPushSubscription.deleteMany({ where: { id: row.id, adminId: row.adminId } })
      return { registered: false }
    }

    if (row.adminSessionId !== auth.session.id) {
      await prisma.adminPushSubscription.updateMany({
        where: { id: row.id, adminId: auth.admin.id },
        data: { adminSessionId: auth.session.id },
      })
    }
    return { registered: true }
  } catch (error) {
    console.error("[push] could not check this device's subscription", error)
    return { registered: false }
  }
}

/** Sends a test notification to this device only. Rate-limited per administrator. */
export async function sendTestPushAction(input: unknown): Promise<PushActionResult> {
  const parsed = pushEndpointSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Turn notifications on for this device first." }

  const auth = await authorizeAdmin()
  if (!auth.ok) return { ok: false, message: auth.message }
  if (!isPushConfigured()) return notConfigured()

  const verdict = await consumeRateLimit(
    [{ key: { scope: RATE_LIMIT_SCOPES.pushTestAdmin, identifier: auth.admin.id }, max: PUSH_TEST_MAX_PER_ADMIN }],
    PUSH_TEST_WINDOW_MS
  )
  if (!verdict.allowed) return { ok: false, message: "That is enough tests for now. Try again in a few minutes." }

  const owned = await prisma.adminPushSubscription.findFirst({
    where: { endpoint: parsed.data.endpoint, adminId: auth.admin.id },
    select: { id: true },
  })
  if (!owned) return { ok: false, message: "Turn notifications on for this device first." }

  const result = await sendPushToAdmins(
    { endpoint: parsed.data.endpoint, adminId: auth.admin.id },
    buildPushPayload({
      kind: "TEST",
      title: "Notifications are working",
      body: "This device will receive alerts from the dashboard.",
      path: "/settings/notifications",
      tag: "test",
    }),
    { ttlSeconds: 120, urgency: "high" }
  )

  if (result.sent > 0) return { ok: true, message: "Test sent. It should appear within a few seconds." }
  if (result.removed > 0) {
    return { ok: false, message: "The browser's push service no longer recognises this device. Turn notifications off and on again." }
  }
  return { ok: false, message: "The push service did not accept the test. Please try again in a moment." }
}
