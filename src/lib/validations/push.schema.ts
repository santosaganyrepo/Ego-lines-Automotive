import { z } from "zod"

import { isAllowedPushEndpoint } from "@/lib/push/push-endpoint"

/**
 * A browser's push subscription, as `PushSubscription.toJSON()` produces it.
 *
 * Validated before anything is stored or sent: the endpoint must belong to a
 * real push service (push-endpoint.ts — this is the SSRF guard), and the keys
 * must be the fixed-length base64url values Web Push encryption uses. Bounds
 * match the AdminPushSubscription_shape_check constraint.
 */

const endpoint = z
  .string()
  .trim()
  .max(1024, "That subscription is not valid.")
  .refine(isAllowedPushEndpoint, { message: "That browser's push service is not supported." })

const base64url = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^[A-Za-z0-9_-]+={0,2}$/, "That subscription is not valid.")

export const pushSubscriptionSchema = z.object({
  endpoint,
  keys: z.object({
    // An uncompressed P-256 public key: 65 bytes → 87 characters (88 padded).
    p256dh: base64url(80, 100),
    // 16 random bytes → 22 characters (24 padded).
    auth: base64url(16, 32),
  }),
})

export const pushEndpointSchema = z.object({ endpoint })

export const pushDeviceRefSchema = z.object({
  deviceId: z.string().trim().min(1).max(64).regex(/^[a-z0-9]+$/i),
})

/** Sent by the service worker when the browser replaces a subscription. */
export const pushRenewalSchema = z.object({
  oldEndpoint: endpoint,
  subscription: pushSubscriptionSchema,
})

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>
