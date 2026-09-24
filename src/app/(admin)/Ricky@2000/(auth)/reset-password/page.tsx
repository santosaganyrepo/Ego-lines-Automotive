import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AdminAuthShell } from "@/components/admin/admin-auth-shell"
import { AdminResetPasswordForm } from "@/components/admin/admin-reset-password-form"
import { Button } from "@/components/ui/button"
import { redeemPasswordResetLinkAction } from "@/lib/actions/auth.actions"
import { getSessionUser } from "@/lib/auth/dal"
import { ADMIN_BASE_PATH } from "@/lib/constants/admin-routes"

export const metadata: Metadata = {
  title: "Set a New Password",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

const backToSignIn = (
  <Link
    href={`${ADMIN_BASE_PATH}/login`}
    className="inline-flex items-center underline underline-offset-4 transition-colors duration-fast hover:text-gold-ink pointer-coarse:min-h-11"
  >
    Back to sign in
  </Link>
)

export default async function AdminResetPasswordPage({ searchParams }: PageProps<"/Ricky@2000/reset-password">) {
  /**
   * Arrived from the reset email: the token is still unspent. Show one
   * button that spends it (a POST — see redeemPasswordResetLinkAction for
   * why a GET never may), whatever session this browser already holds.
   */
  const { token_hash: tokenHash } = await searchParams
  if (typeof tokenHash === "string" && tokenHash.length > 0) {
    return (
      <AdminAuthShell title="Reset your password" footer={backToSignIn}>
        <form action={redeemPasswordResetLinkAction} className="flex flex-col gap-6">
          <input type="hidden" name="tokenHash" value={tokenHash} />
          <p className="text-body text-muted-foreground">
            Continue to choose a new password for your dashboard account. This link can be used once.
          </p>
          <Button type="submit" size="lg">
            Continue
          </Button>
        </form>
      </AdminAuthShell>
    )
  }

  /**
   * Gated on a *session*, not on an admin profile.
   *
   * At this point the caller arrived from /auth/confirm, which exchanged a
   * one-time recovery token for a session. That is the proof of identity
   * this page needs. The admin-profile check still happens — in
   * updatePasswordAction, before anything is written — which is where it
   * belongs, since the action is a public endpoint reachable without ever
   * loading this page.
   */
  const user = await getSessionUser()

  if (!user) {
    redirect(`${ADMIN_BASE_PATH}/login?error=invalid_link`)
  }

  return (
    <AdminAuthShell title="Set a new password" footer={backToSignIn}>
      <AdminResetPasswordForm />
    </AdminAuthShell>
  )
}
