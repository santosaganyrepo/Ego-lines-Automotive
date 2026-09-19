/**
 * What the current browser can do with the installable dashboard.
 *
 * Pure functions over values the caller reads from `navigator`/`window`, so
 * they run in unit tests and never touch the DOM themselves.
 */

/** iPhone, iPod, or an iPad — including iPadOS, which reports itself as a Mac with touch. */
export function isAppleMobile(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1
}

/**
 * Whether the dashboard is running as the installed app rather than in a tab.
 * `navigatorStandalone` is Safari's own flag, which predates the media query.
 */
export function isStandaloneDisplay(displayModeStandalone: boolean, navigatorStandalone: boolean | undefined): boolean {
  return displayModeStandalone || navigatorStandalone === true
}

/** The VAPID public key (base64url) as the bytes `pushManager.subscribe` wants. */
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
  const binary = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

/**
 * Whether a browser subscription was made with this server's current key.
 * One made with an older key can never receive a delivery again, so it has to
 * be replaced rather than reused.
 */
export function subscriptionMatchesKey(applicationServerKey: ArrayBuffer | null | undefined, publicKey: string): boolean {
  if (!applicationServerKey) return false
  const expected = base64UrlToBytes(publicKey)
  const actual = new Uint8Array(applicationServerKey)
  if (actual.length !== expected.length) return false
  return actual.every((byte, index) => byte === expected[index])
}
