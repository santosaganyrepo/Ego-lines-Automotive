import "server-only"

import { siteConfig } from "@/config/site"

/**
 * The deployment's Web Push (VAPID) identity.
 *
 * The public key is sent to browsers when they subscribe; the private key
 * signs every delivery and never leaves the server. Without both, push is
 * "not set up": the dashboard says so, and every send is a quiet no-op —
 * nothing else about the dashboard depends on it.
 */

export interface VapidConfig {
  publicKey: string
  privateKey: string
  subject: string
}

const BASE64URL = /^[A-Za-z0-9_-]+$/

/** The public key browsers subscribe with, or null when push is not set up. */
export function vapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  // An uncompressed P-256 point: 65 bytes, 87 characters of base64url.
  return key && key.length === 87 && BASE64URL.test(key) ? key : null
}

function privateKey(): string | null {
  const key = process.env.VAPID_PRIVATE_KEY?.trim()
  // A P-256 scalar: 32 bytes, 43 characters of base64url.
  return key && key.length === 43 && BASE64URL.test(key) ? key : null
}

/**
 * Who push services contact about this sender: VAPID_SUBJECT when it is a
 * usable mailto: or https: value, else the site's own https URL, else the
 * business email from Settings. Push services reject anything else.
 */
function resolveSubject(businessEmail: string): string | null {
  const configured = process.env.VAPID_SUBJECT?.trim() ?? ""
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configured) || /^https:\/\/[^\s]+$/.test(configured)) {
    return configured
  }
  if (siteConfig.url.startsWith("https://")) return siteConfig.url
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) return `mailto:${businessEmail}`
  return null
}

/** Whether both keys are present — enough for the dashboard to offer push. */
export function isPushConfigured(): boolean {
  return vapidPublicKey() !== null && privateKey() !== null
}

let warned = false

/** Everything a delivery needs, or null (with one warning per process) when push is not set up. */
export function vapidConfig(businessEmail: string): VapidConfig | null {
  const publicKey = vapidPublicKey()
  const secret = privateKey()
  const subject = resolveSubject(businessEmail)

  if (!publicKey || !secret || !subject) {
    if (!warned) {
      warned = true
      console.warn(
        "[push] Web Push is not configured: set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (see .env.example)."
      )
    }
    return null
  }

  return { publicKey, privateKey: secret, subject }
}
