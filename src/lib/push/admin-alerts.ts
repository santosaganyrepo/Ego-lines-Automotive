import "server-only"

import { AdminLoginEventKind } from "@/generated/prisma/enums"
import { ADMIN_LOGIN_MAX_ATTEMPTS, ADMIN_LOGIN_WINDOW_MINUTES } from "@/lib/auth/rate-limit"
import { prisma } from "@/lib/prisma"
import { buildPushPayload } from "@/lib/push/push-payload"
import { sendPushToAdmins } from "@/lib/push/send-push"
import { getOperationalSettings } from "@/lib/queries/settings.queries"

/**
 * The notifications the dashboard sends to administrators' devices.
 *
 * Every function here is safe to call from `after()`: it never throws, and
 * each decides for itself whether it applies, so a caller only has to say
 * what happened.
 *
 * Wording is written for a lock screen (see push-payload.ts): what happened
 * and the reference to look it up by, never a customer's personal details.
 */

/** A customer asked for a quotation. Respects Settings → Notifications. */
export async function pushNewQuoteRequest(input: {
  quoteId: string
  quoteNumber: string
  typeLabel: string
}): Promise<void> {
  try {
    const { notifications } = await getOperationalSettings()
    if (!notifications.notifyAdminsOfNewQuotes || !notifications.pushNotificationsEnabled) return

    await sendPushToAdmins(
      { allActiveAdmins: true },
      buildPushPayload({
        kind: "QUOTE_REQUEST",
        title: "New quote request",
        body: `${input.quoteNumber} · ${input.typeLabel}. Tap to open it in the dashboard.`,
        path: `/quotes/${input.quoteId}`,
        tag: `quote-${input.quoteNumber}`,
      }),
      // A day: a phone that was off overnight still hears about it.
      { ttlSeconds: 24 * 60 * 60, urgency: "high" }
    )
  } catch (error) {
    console.error("[push] could not announce a new quote request", error)
  }
}

/**
 * A customer pressed "Accept quotation" on their quotation link. Sent to every
 * active administrator while the push channel is on — the one moment a
 * customer is ready to pay, and worth interrupting for. No amount or name on
 * the lock screen, as for every notification here.
 */
export async function pushQuoteAccepted(input: { quoteId: string; quoteNumber: string }): Promise<void> {
  try {
    const { notifications } = await getOperationalSettings()
    if (!notifications.pushNotificationsEnabled) return

    await sendPushToAdmins(
      { allActiveAdmins: true },
      buildPushPayload({
        kind: "QUOTE_ACCEPTED",
        title: "Quotation accepted",
        body: `The customer accepted ${input.quoteNumber}. Tap to open it and convert it to an order.`,
        path: `/quotes/${input.quoteId}`,
        tag: `accepted-${input.quoteNumber}`,
        requireInteraction: true,
      }),
      { ttlSeconds: 24 * 60 * 60, urgency: "high" }
    )
  } catch (error) {
    console.error("[push] could not announce an accepted quotation", error)
  }
}

/** How far back a device counts as "seen before" for the new-device alert. */
const KNOWN_DEVICE_DAYS = 90

/**
 * A successful sign-in from a device this administrator has not used for
 * 90 days — the one sign-in worth interrupting them about. Security alerts
 * are sent to the administrator's own devices whatever the push channel
 * switch says: they are about the account, not the business.
 *
 * Call after the SIGN_IN_SUCCEEDED event for this sign-in is recorded.
 */
export async function pushNewDeviceSignIn(input: { adminId: string; deviceLabel: string | null }): Promise<void> {
  try {
    if (!input.deviceLabel) return

    const since = new Date(Date.now() - KNOWN_DEVICE_DAYS * 24 * 60 * 60 * 1000)
    const seen = await prisma.adminLoginEvent.count({
      where: {
        adminId: input.adminId,
        kind: AdminLoginEventKind.SIGN_IN_SUCCEEDED,
        deviceLabel: input.deviceLabel,
        createdAt: { gte: since },
      },
    })
    // One is this sign-in itself.
    if (seen > 1) return

    await sendPushToAdmins(
      { adminIds: [input.adminId] },
      buildPushPayload({
        kind: "SECURITY",
        title: "New sign-in to your account",
        body: `Signed in on ${input.deviceLabel}. If this wasn’t you, change your password now.`,
        path: "/settings/security/sessions",
        tag: "security-sign-in",
        requireInteraction: true,
      }),
      { ttlSeconds: 60 * 60, urgency: "high" }
    )
  } catch (error) {
    console.error("[push] could not send a new-device sign-in alert", error)
  }
}

/**
 * Someone has just used up the wrong-password allowance for this
 * administrator's address. Sent once, on the attempt that reaches the limit —
 * not on every refused attempt after it.
 *
 * Call after the SIGN_IN_FAILED event for this attempt is recorded.
 */
export async function pushSignInLockout(input: { adminId: string }): Promise<void> {
  try {
    const since = new Date(Date.now() - ADMIN_LOGIN_WINDOW_MINUTES * 60 * 1000)
    const failures = await prisma.adminLoginEvent.count({
      where: { adminId: input.adminId, kind: AdminLoginEventKind.SIGN_IN_FAILED, createdAt: { gte: since } },
    })
    if (failures !== ADMIN_LOGIN_MAX_ATTEMPTS) return

    await sendPushToAdmins(
      { adminIds: [input.adminId] },
      buildPushPayload({
        kind: "SECURITY",
        title: "Sign-in blocked",
        body: `${ADMIN_LOGIN_MAX_ATTEMPTS} wrong passwords were entered for your account, so sign-in is paused for ${ADMIN_LOGIN_WINDOW_MINUTES} minutes. If this wasn’t you, review your security settings.`,
        path: "/settings/security/activity",
        tag: "security-lockout",
        requireInteraction: true,
      }),
      { ttlSeconds: 60 * 60, urgency: "high" }
    )
  } catch (error) {
    console.error("[push] could not send a sign-in lockout alert", error)
  }
}
