/**
 * The message a push notification carries from the server to the dashboard's
 * service worker (public/sw.js reads exactly this shape).
 *
 * ── What it may contain ───────────────────────────────────────────────
 * A notification is shown on a lock screen, to anyone holding the phone. It
 * therefore names *what* happened and the reference to look it up by — never
 * a customer's name, phone number, address or an amount. The dashboard, behind
 * sign-in, holds the rest; tapping the notification opens it there.
 *
 * `path` is a path inside the dashboard, not a URL. The service worker joins
 * it to its own scope and refuses anything else, so a notification can never
 * open another site.
 *
 * Pure: shared by the sender and the unit tests.
 */

export const PUSH_PAYLOAD_VERSION = 1

export type PushKind = "QUOTE_REQUEST" | "SECURITY" | "TEST"

export interface PushPayload {
  v: typeof PUSH_PAYLOAD_VERSION
  kind: PushKind
  title: string
  body: string
  /** Dashboard path to open on tap, e.g. "/quotes/abc123" — relative to the dashboard's base path. */
  path: string
  /** Notifications with the same tag replace each other instead of stacking. */
  tag: string
  /** Stays on screen until dismissed (where the platform allows). Security alerts only. */
  requireInteraction?: boolean
}

const TITLE_MAX = 60
const BODY_MAX = 180

function clip(text: string, max: number): string {
  const single = text.replace(/\s+/g, " ").trim()
  return single.length > max ? `${single.slice(0, max - 1).trimEnd()}…` : single
}

/** Only a plain dashboard path: starts with one slash, no scheme, no "//", no backslash, no dot-segments. */
export function isSafeDashboardPath(path: string): boolean {
  return (
    /^\/[A-Za-z0-9\-._~/?=&%]*$/.test(path) &&
    !path.startsWith("//") &&
    !/(^|\/)\.\.?(\/|$|\?)/.test(path)
  )
}

/**
 * Builds a payload, clipping text to what a notification can show and
 * falling back to the dashboard home for a path that is not a plain one.
 */
export function buildPushPayload(input: Omit<PushPayload, "v">): PushPayload {
  return {
    v: PUSH_PAYLOAD_VERSION,
    kind: input.kind,
    title: clip(input.title, TITLE_MAX),
    body: clip(input.body, BODY_MAX),
    path: isSafeDashboardPath(input.path) ? input.path : "/",
    tag: input.tag.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 32) || "admin",
    ...(input.requireInteraction ? { requireInteraction: true } : {}),
  }
}
