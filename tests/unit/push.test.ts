import { beforeEach, describe, expect, it, vi } from "vitest"

import { isAllowedPushEndpoint } from "@/lib/push/push-endpoint"
import { buildPushPayload, isSafeDashboardPath } from "@/lib/push/push-payload"
import { base64UrlToBytes, isAppleMobile, isStandaloneDisplay, subscriptionMatchesKey } from "@/lib/pwa/pwa-environment"
import { pushSubscriptionSchema } from "@/lib/validations/push.schema"

/* ── The SSRF guard ─────────────────────────────────────────────────── */

describe("isAllowedPushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc:APA91b",
    "https://fcm.googleapis.com/wp/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
    "https://web.push.apple.com/QGuQyavXutnMH",
    "https://wns2-bl2p.notify.windows.com/w/?token=abc",
  ])("accepts the real push service %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(true)
  })

  it.each([
    ["plain http", "http://fcm.googleapis.com/fcm/send/abc"],
    ["a look-alike domain", "https://fcm.googleapis.com.evil.example/x"],
    ["a suffix without a dot boundary", "https://evilpush.apple.com.example/x"],
    ["an internal address", "https://169.254.169.254/latest/meta-data"],
    ["localhost", "https://localhost/push"],
    ["credentials in the URL", "https://user:pass@fcm.googleapis.com/x"],
    ["an explicit port", "https://fcm.googleapis.com:8443/x"],
    ["not a URL", "fcm.googleapis.com/x"],
  ])("refuses %s", (_label, endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(false)
  })

  it("is enforced by the subscription schema", () => {
    const keys = { p256dh: "B".repeat(87), auth: "a".repeat(22) }
    expect(pushSubscriptionSchema.safeParse({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys }).success).toBe(true)
    expect(pushSubscriptionSchema.safeParse({ endpoint: "https://example.com/x", keys }).success).toBe(false)
    expect(
      pushSubscriptionSchema.safeParse({ endpoint: "https://fcm.googleapis.com/x", keys: { ...keys, auth: "<script>" } }).success
    ).toBe(false)
  })
})

/* ── Payloads ───────────────────────────────────────────────────────── */

describe("buildPushPayload", () => {
  it("keeps only plain dashboard paths", () => {
    expect(isSafeDashboardPath("/quotes/abc123")).toBe(true)
    expect(isSafeDashboardPath("/settings/security/sessions")).toBe(true)
    for (const bad of ["https://evil.example", "//evil.example", "/../x", "/a/./b", "javascript:alert(1)", "/a\\b", "quotes"]) {
      expect(isSafeDashboardPath(bad), bad).toBe(false)
    }
    expect(buildPushPayload({ kind: "TEST", title: "t", body: "b", path: "//evil.example", tag: "x" }).path).toBe("/")
  })

  it("clips text for a notification and makes the tag a valid Topic header", () => {
    const payload = buildPushPayload({
      kind: "QUOTE_REQUEST",
      title: "x".repeat(200),
      body: "line\n\n  two",
      path: "/quotes/1",
      tag: "quote-CLM-Q-2026-000045 extra words beyond thirty-two",
    })
    expect(payload.title.length).toBeLessThanOrEqual(60)
    expect(payload.body).toBe("line two")
    expect(payload.tag).toMatch(/^[A-Za-z0-9_-]{1,32}$/)
    expect(payload.requireInteraction).toBeUndefined()
  })
})

/* ── Browser helpers ────────────────────────────────────────────────── */

describe("pwa environment", () => {
  it("recognises iPhone, and iPadOS reporting itself as a Mac with touch", () => {
    expect(isAppleMobile("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)", 5)).toBe(true)
    expect(isAppleMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true)
    expect(isAppleMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(false)
    expect(isAppleMobile("Mozilla/5.0 (Linux; Android 14; Pixel 7)", 5)).toBe(false)
  })

  it("treats Safari's own standalone flag as installed", () => {
    expect(isStandaloneDisplay(false, true)).toBe(true)
    expect(isStandaloneDisplay(true, undefined)).toBe(true)
    expect(isStandaloneDisplay(false, undefined)).toBe(false)
  })

  it("converts a VAPID key and spots a subscription made with an old one", () => {
    const key = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM"
    const bytes = base64UrlToBytes(key)
    expect(bytes.length).toBe(65)
    expect(subscriptionMatchesKey(bytes.buffer, key)).toBe(true)
    const other = new Uint8Array(bytes)
    other[10] ^= 1
    expect(subscriptionMatchesKey(other.buffer, key)).toBe(false)
    expect(subscriptionMatchesKey(null, key)).toBe(false)
  })
})

/* ── Delivery ───────────────────────────────────────────────────────── */

const db = vi.hoisted(() => ({
  devices: [] as { id: string; adminId: string; endpoint: string; p256dh: string; auth: string }[],
  deleted: [] as string[],
  failureCount: 0,
  successes: 0,
  loginEvents: 0,
}))
const send = vi.hoisted(() => ({ fn: vi.fn() }))
const vapid = vi.hoisted(() => ({ configured: true }))

vi.mock("server-only", () => ({}))
vi.mock("web-push", () => {
  class WebPushError extends Error {
    statusCode: number
    constructor(statusCode: number) {
      super(`status ${statusCode}`)
      this.statusCode = statusCode
    }
  }
  return { default: { sendNotification: (...args: unknown[]) => send.fn(...args) }, WebPushError }
})
vi.mock("@/lib/push/push-config", () => ({
  vapidConfig: () => (vapid.configured ? { publicKey: "p", privateKey: "k", subject: "mailto:a@b.co" } : null),
  isPushConfigured: () => vapid.configured,
}))
vi.mock("@/lib/queries/settings.queries", () => ({
  getPublicSiteSettings: async () => ({ contact: { email: "a@b.co" } }),
  getOperationalSettings: async () => ({ notifications: { notifyAdminsOfNewQuotes: true, pushNotificationsEnabled: true } }),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminPushSubscription: {
      findMany: async () => db.devices,
      deleteMany: async ({ where }: { where: { id: string } }) => {
        db.deleted.push(where.id)
        return { count: 1 }
      },
      update: async () => ({ failureCount: ++db.failureCount }),
      updateMany: async () => {
        db.successes += 1
        return { count: 1 }
      },
    },
    adminLoginEvent: { count: async () => db.loginEvents },
  },
}))

const { sendPushToAdmins } = await import("@/lib/push/send-push")
const { WebPushError } = await import("web-push")
const { pushNewDeviceSignIn, pushSignInLockout } = await import("@/lib/push/admin-alerts")
const { ADMIN_LOGIN_MAX_ATTEMPTS } = await import("@/lib/auth/rate-limit")

const payload = buildPushPayload({ kind: "TEST", title: "t", body: "b", path: "/", tag: "t" })
const device = (id: string) => ({ id, adminId: "a1", endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, p256dh: "p", auth: "a" })

beforeEach(() => {
  db.devices = [device("d1")]
  db.deleted = []
  db.failureCount = 0
  db.successes = 0
  db.loginEvents = 0
  vapid.configured = true
  send.fn.mockReset()
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

describe("sendPushToAdmins", () => {
  it("delivers and records the success", async () => {
    send.fn.mockResolvedValue({ statusCode: 201 })
    expect(await sendPushToAdmins({ allActiveAdmins: true }, payload, { ttlSeconds: 60, urgency: "high" })).toEqual({
      sent: 1,
      removed: 0,
      failed: 0,
    })
    expect(db.successes).toBe(1)
  })

  it.each([404, 410, 403])("removes a device the push service answers %i for", async (status) => {
    send.fn.mockRejectedValue(new WebPushError(status as never, 0 as never, {} as never, "", ""))
    const result = await sendPushToAdmins({ allActiveAdmins: true }, payload, { ttlSeconds: 60, urgency: "high" })
    expect(result.removed).toBe(1)
    expect(db.deleted).toEqual(["d1"])
  })

  it("keeps a device through a temporary failure and counts it", async () => {
    send.fn.mockRejectedValue(new WebPushError(503 as never, 0 as never, {} as never, "", ""))
    const result = await sendPushToAdmins({ allActiveAdmins: true }, payload, { ttlSeconds: 60, urgency: "high" })
    expect(result).toEqual({ sent: 0, removed: 0, failed: 1 })
    expect(db.deleted).toEqual([])
    expect(db.failureCount).toBe(1)
  })

  it("never sends to an endpoint outside the push services, even one already stored", async () => {
    db.devices = [{ ...device("d1"), endpoint: "https://169.254.169.254/x" }]
    await sendPushToAdmins({ allActiveAdmins: true }, payload, { ttlSeconds: 60, urgency: "high" })
    expect(send.fn).not.toHaveBeenCalled()
  })

  it("does nothing, quietly, when push is not configured", async () => {
    vapid.configured = false
    expect((await sendPushToAdmins({ allActiveAdmins: true }, payload, { ttlSeconds: 60, urgency: "high" })).sent).toBe(0)
    expect(send.fn).not.toHaveBeenCalled()
  })
})

describe("security alerts", () => {
  it("announces a lockout once — on the attempt that reaches the limit", async () => {
    send.fn.mockResolvedValue({ statusCode: 201 })
    db.loginEvents = ADMIN_LOGIN_MAX_ATTEMPTS - 1
    await pushSignInLockout({ adminId: "a1" })
    db.loginEvents = ADMIN_LOGIN_MAX_ATTEMPTS + 1
    await pushSignInLockout({ adminId: "a1" })
    expect(send.fn).not.toHaveBeenCalled()

    db.loginEvents = ADMIN_LOGIN_MAX_ATTEMPTS
    await pushSignInLockout({ adminId: "a1" })
    expect(send.fn).toHaveBeenCalledTimes(1)
  })

  it("alerts on a sign-in from a new device, not a known one", async () => {
    send.fn.mockResolvedValue({ statusCode: 201 })
    db.loginEvents = 3
    await pushNewDeviceSignIn({ adminId: "a1", deviceLabel: "Chrome on Windows" })
    expect(send.fn).not.toHaveBeenCalled()

    db.loginEvents = 1
    await pushNewDeviceSignIn({ adminId: "a1", deviceLabel: "Safari on iPhone" })
    expect(send.fn).toHaveBeenCalledTimes(1)
    const [, body] = send.fn.mock.calls[0] as [unknown, string]
    expect(JSON.parse(body)).toMatchObject({ kind: "SECURITY", path: "/settings/security/sessions" })
  })
})
