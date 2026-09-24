import "server-only"

import { getEmailLinkOrigin } from "@/lib/auth/email-link-origin"
import { passwordResetLink } from "@/lib/auth/password-reset-link"
import { ADMIN_BASE_PATH } from "@/lib/constants/admin-routes"
import { renderEmailHtml, renderEmailText, type EmailContent } from "@/lib/email/email-layout"
import { sendEmail } from "@/lib/email/send-email"
import { getPublicSiteSettings } from "@/lib/queries/settings.queries"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Sends an administrator their password-reset email.
 *
 * ── Why the application sends it, not Supabase ───────────────────────────
 * Supabase's own reset email builds its link from two dashboard settings —
 * the project's Site URL and its Redirect URL allow-list — and silently falls
 * back to the Site URL whenever the address we ask for is not on the list.
 * Both live outside this codebase, differ per environment, and were the
 * reason administrators were sent to `localhost:8000` and "This site can't be
 * reached". Its built-in mailer is also limited to a handful of emails an
 * hour, which is not enough to rely on for account recovery.
 *
 * So the one-time token is minted server-side with the secret key
 * (`generateLink`, which sends nothing) and the link is built here, on the
 * site origin the rest of the application uses (src/lib/utils/site-url.ts),
 * and sent through Resend like every other email. Neither Supabase setting is
 * involved, so there is nothing left to misconfigure per environment.
 *
 * The link opens the reset page with the token in it; the token is only
 * spent when the administrator presses "Continue" there (a POST). Corporate
 * mail scanners open every link in an email, and a link that redeemed its
 * token on GET would be used up before the person ever clicked it.
 *
 * ── Fallback ──────────────────────────────────────────────────────────────
 * Without Resend configured (or if it refuses the message) the request falls
 * back to Supabase's own email, as before, so account recovery never depends
 * on one provider. That path still relies on the Supabase URL settings; see
 * `npm run auth:configure-urls`.
 */

export type PasswordResetDelivery = "SENT" | "SENT_BY_SUPABASE" | "FAILED"

export async function sendAdminPasswordResetEmail(email: string): Promise<PasswordResetDelivery> {
  const origin = await getEmailLinkOrigin()

  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email })
  const tokenHash = data?.properties?.hashed_token

  if (error || !tokenHash) {
    console.error("[auth] could not create a password-reset token", { code: error?.code ?? "no_token" })
    return "FAILED"
  }

  const { businessName } = await getPublicSiteSettings()
  const brand = { siteName: businessName, siteUrl: origin }
  const content: EmailContent = {
    preheader: "Use the link inside to choose a new password.",
    heading: "Reset your password",
    greeting: "Hello,",
    paragraphs: [
      `Someone asked to reset the password for the ${businessName} dashboard account using this email address.`,
      "Press the button below and then “Continue” to choose a new password. The link works once and expires soon.",
    ],
    callToAction: { label: "Choose a new password", url: passwordResetLink(origin, tokenHash) },
    closing: [
      "If you did not ask for this, you can ignore this email — your password will not change. If it keeps happening, tell another administrator.",
    ],
  }

  const sent = await sendEmail({
    to: email,
    subject: `Reset your ${businessName} dashboard password`,
    text: renderEmailText(content, brand),
    html: renderEmailHtml(content, brand),
  })

  if (sent.ok) return "SENT"

  if (sent.reason === "PROVIDER_ERROR") {
    console.error("[auth] Resend could not send the password-reset email; falling back to Supabase's mailer")
  }

  // Supabase issues its own token for this, replacing the unsent one above.
  const supabase = await createClient()
  const fallback = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(`${ADMIN_BASE_PATH}/reset-password`)}`,
  })

  if (fallback.error) {
    console.error("[auth] Supabase could not send the password-reset email", { code: fallback.error.code ?? "unknown" })
    return "FAILED"
  }
  return "SENT_BY_SUPABASE"
}
