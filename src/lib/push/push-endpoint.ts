/**
 * Which push-service URLs the server will deliver to.
 *
 * A browser's push subscription is an https URL at its vendor's push service,
 * and delivering a notification is an HTTP POST from this server to that URL.
 * Accepting any URL would let whoever registers a "subscription" make the
 * server send requests wherever they like — including to internal addresses
 * (server-side request forgery). So only the vendors' own services are
 * accepted, matched on the exact host or a whole-label subdomain of it.
 *
 * Pure: shared by the Zod schema, the send path and the unit tests.
 */

/** Hosts (and their subdomains) that operate Web Push services. */
export const PUSH_SERVICE_HOSTS = [
  // Chrome, Edge on Android, Samsung Internet, Opera, Brave — Firebase Cloud Messaging.
  "fcm.googleapis.com",
  "android.googleapis.com",
  // Firefox.
  "push.services.mozilla.com",
  // Safari on macOS, iPhone and iPad (iOS 16.4+ for an installed web app).
  "push.apple.com",
  // Edge on Windows — Windows Push Notification Services, e.g. wns2-bl2p.notify.windows.com.
  "notify.windows.com",
] as const

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }

  if (url.protocol !== "https:") return false
  // No credentials and no explicit port: a real push endpoint never has either.
  if (url.username || url.password || url.port) return false

  const host = url.hostname.toLowerCase()
  return PUSH_SERVICE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}
