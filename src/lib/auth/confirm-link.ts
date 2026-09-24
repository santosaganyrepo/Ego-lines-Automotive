import "server-only"

import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { syncAdminEmail } from "@/lib/auth/admin-account"
import { ADMIN_LOGIN_PATH, resolveReturnPath } from "@/lib/auth/return-path"
import { createClient } from "@/lib/supabase/server"

/**
 * Everything that can arrive back from a Supabase authentication email, and
 * what this application does with each of it.
 *
 * Shared by `/auth/confirm` and `/auth/callback`: the second is an alias, for
 * the simple reason that "which path does the link come back to" is decided
 * by the Supabase project's email templates and redirect allow-list, not by
 * this codebase, and `/auth/callback` is the name Supabase's own examples
 * use. A confirmation link pointing at a path this app does not serve is a
 * plain 404 — "Page not found", with no clue as to why — which is exactly
 * the failure the dealership reported on the email-change link.
 *
 * ── The four shapes ──────────────────────────────────────────────────────
 *  1. `token_hash` + `type`  — a template written with `{{ .TokenHash }}`.
 *     Verified here, server-side, so the token never reaches client
 *     JavaScript and the session lands in HttpOnly cookies (SECURITY.MD
 *     §5.3, §27). This is the shape to prefer; see the note at the bottom.
 *  2. `code`                 — the PKCE authorization code, from a template
 *     using `{{ .ConfirmationURL }}` on a flow that started with a code
 *     challenge. Exchanged for a session, again server-side.
 *  3. `error` / `error_code` / `error_description` — Supabase refused the
 *     token: expired, already used (mail scanners open links), or forged.
 *  4. `message` with nothing else — the "secure email change" half-step:
 *     one of the two addresses has confirmed and the other has not. Nothing
 *     has gone wrong and no session is issued.
 *
 * A fifth shape carries the session in the URL *fragment*, which by
 * definition never reaches a server. That one cannot be handled here at all,
 * so it is forwarded to a small page that can read it — see
 * `/Ricky@2000/login/confirm`.
 */

/**
 * Redirects to a path on the same origin, without naming that origin.
 *
 * `NextResponse.redirect()` demands an absolute URL, and the obvious way to
 * build one — `new URL(path, request.url)` — is wrong behind a reverse
 * proxy. `request.url` carries the host and port Next.js is actually
 * listening on, so a proxied request produces a Location that mixes the
 * external protocol with the internal port: `https://example.com:3000/…`,
 * which resolves to nothing. Codespaces' port forwarding and Vercel both
 * front the app this way, so this is the normal case, not an edge one.
 *
 * A relative Location avoids the question entirely. RFC 7231 §7.1.2 permits
 * it and every browser resolves it against the request URL — which is the
 * externally-visible one, by definition. That makes this correct on
 * localhost, in a Codespace, and in production without any of them needing
 * to be detected.
 *
 * It also preserves the URL fragment, which matters for the forward to
 * the sign-in area's confirm screen: a browser re-applies the original fragment to a
 * redirect target that has none of its own, which is the only way a
 * fragment can survive a hop through the server at all.
 */
function redirectToPath(path: string): NextResponse {
  return new NextResponse(null, {
    status: 307,
    headers: { Location: path, "Cache-Control": "no-store" },
  })
}

/**
 * The token types this application issues: a password recovery, and the
 * invitation that provisions an administrator.
 *
 * The value arrives in a query string, so it is untrusted, and it used to be
 * cast straight to `EmailOtpType`. Supabase would reject nonsense, but
 * "signup", "magiclink" and "email_change" are real types for flows this
 * project never runs, and the route should not complete them.
 *
 * "email" is accepted alongside "invite" because it is Supabase's unified
 * type for invitation token hashes — which of the two an invite template
 * uses depends on how the template in the dashboard was written, and
 * refusing one would lock a new administrator out of their invitation. This
 * is defence in depth, not the gate: a session obtained here reaches nothing
 * until the DAL finds an active AdminProfile for it.
 */
const ACCEPTED_OTP_TYPES: ReadonlySet<EmailOtpType> = new Set<EmailOtpType>([
  "recovery",
  "invite",
  "email",
  // An administrator changing their own address from Settings → Admin users &
  // security. The change itself is Supabase's; below, our copy follows it.
  "email_change",
])

function parseOtpType(value: string | null): EmailOtpType | null {
  if (!value) return null
  return ACCEPTED_OTP_TYPES.has(value as EmailOtpType) ? (value as EmailOtpType) : null
}

/** Our copy of the address follows Supabase's, once the change is complete. */
async function followEmailChange(supabase: Awaited<ReturnType<typeof createClient>>): Promise<void> {
  // `getUser()` asks Supabase, rather than trusting the cookie, which
  // address the account now has. Our copy only follows once the change has
  // actually been completed there; an administrator profile is required.
  const { data } = await supabase.auth.getUser()
  if (data.user?.email) await syncAdminEmail(data.user.id, data.user.email)
}

export async function handleConfirmationLink(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl

  const tokenHash = searchParams.get("token_hash")
  const type = parseOtpType(searchParams.get("type"))
  const code = searchParams.get("code")
  const next = searchParams.get("next")

  // Where to land after a successful exchange. Re-validated rather than
  // trusted: this URL arrives from an email, and an attacker who can get a
  // crafted link in front of an administrator would otherwise have an open
  // redirect that carries a freshly minted session with it.
  const destination = resolveReturnPath(next ?? undefined)

  // ── 3. Supabase already said no ───────────────────────────────────────
  // Expired, already used, or forged — all the same from here. The login
  // page renders one neutral message for this code; distinguishing the
  // cases would confirm to a stranger that a given token was once real.
  if (searchParams.get("error") ?? searchParams.get("error_code")) {
    return redirectToPath(`${ADMIN_LOGIN_PATH}?error=invalid_link`)
  }

  // ── 4. Secure email change, first of two confirmations ────────────────
  // Supabase sends a confirmation to both the old and the new address when
  // "Secure email change" is on, and answers the first one with a message
  // rather than a session. Nothing failed, so this must not read as a bad
  // link — the administrator has one more link to open.
  if (!tokenHash && !code && searchParams.get("message")) {
    return redirectToPath(`${ADMIN_LOGIN_PATH}?notice=email_change_pending`)
  }

  // ── 2. PKCE authorization code ────────────────────────────────────────
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return redirectToPath(`${ADMIN_LOGIN_PATH}?error=invalid_link`)
    await followEmailChange(supabase)
    return redirectToPath(destination)
  }

  // ── 1. Token hash ─────────────────────────────────────────────────────
  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) return redirectToPath(`${ADMIN_LOGIN_PATH}?error=invalid_link`)
    if (type === "email_change") await followEmailChange(supabase)
    return redirectToPath(destination)
  }

  // ── 5. Possibly a fragment ────────────────────────────────────────────
  // Nothing the server can read. Either Supabase put the result in the URL
  // fragment (its implicit-flow answer, which a server never receives), or
  // the link was mangled on its way through a mail client. The page this
  // forwards to can tell those apart, because the browser re-applies the
  // fragment to this redirect.
  return redirectToPath(`${ADMIN_LOGIN_PATH}/confirm?next=${encodeURIComponent(destination)}`)
}
