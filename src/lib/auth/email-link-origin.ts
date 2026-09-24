import "server-only"

import { siteConfig } from "@/config/site"
import { publicOriginProblem } from "@/lib/utils/site-url"

/**
 * Absolute origin for links embedded in authentication emails — password
 * resets and email-change confirmations.
 *
 * It is the site origin every other email uses (src/lib/utils/site-url.ts),
 * which is decided from configuration and the platform — never from the
 * request's Host header. Deriving it from headers would allow poisoning: an
 * attacker sends a request with a forged Host, and the victim receives a
 * genuine email whose link points at the attacker's domain, carrying a live
 * token.
 *
 * On a deployment the origin must be public and https. The resolver already
 * prefers Vercel's own address over a localhost value copied into the
 * project's variables, so this refusal is the last line: if it ever fires,
 * no email is sent, and the reason is logged (and reported to Sentry)
 * instead of mailing an administrator a link that cannot open.
 */
export async function getEmailLinkOrigin(): Promise<string> {
  const origin = siteConfig.url

  if (process.env.VERCEL === "1") {
    const problem = publicOriginProblem(origin)
    if (problem) {
      const message = `The site address ${origin} ${problem} — authentication email links would not open. Set NEXT_PUBLIC_SITE_URL to the live https:// domain and redeploy.`
      console.error(`[auth] ${message}`)
      throw new Error(message)
    }
  }

  return origin
}
