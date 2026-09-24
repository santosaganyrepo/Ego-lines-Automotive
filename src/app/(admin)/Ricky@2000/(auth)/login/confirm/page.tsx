import type { Metadata } from "next"

import { AdminAuthShell } from "@/components/admin/admin-auth-shell"
import { ConfirmationFragmentNotice } from "@/components/admin/confirmation-fragment-notice"
import { ADMIN_LOGIN_PATH, resolveReturnPath } from "@/lib/auth/return-path"

export const metadata: Metadata = {
  title: "Confirming",
  robots: { index: false, follow: false },
}

/**
 * Where a confirmation link lands when the server could read nothing from it.
 *
 * Supabase has two ways of answering a confirmation. One puts a token in the
 * query string, which `/auth/confirm` verifies server-side. The other — its
 * implicit flow, which is what an email-change confirmation uses unless the
 * template is written with `{{ .TokenHash }}` — puts the result in the URL
 * *fragment*, and a fragment is never sent to a server. From the server's
 * point of view that link is empty, which is exactly why it used to end at a
 * blank-looking "not valid" bounce: the answer was there all along, in the
 * one part of the URL the server cannot see.
 *
 * So the answer is read in the browser (see the client component) and
 * reported plainly. Nothing here turns those tokens into a session: by the
 * time this page loads, Supabase has already made the change the link
 * confirms, so there is nothing left to authorise — and a route that minted
 * an administrator session from tokens posted by a page would be a new way
 * in, for no gain.
 *
 * It lives under `/login/` so the proxy already treats it as a sign-in screen
 * (PUBLIC_ADMIN_PATHS in src/lib/supabase/proxy.ts) and it inherits the
 * dashboard's own chrome, rather than needing either to be widened for it.
 */
export const dynamic = "force-dynamic"

export default async function AdminLinkConfirmPage(
  props: PageProps<"/Ricky@2000/login/confirm">
) {
  const searchParams = await props.searchParams
  const rawNext = typeof searchParams.next === "string" ? searchParams.next : undefined

  return (
    <AdminAuthShell title="Confirming your link">
      <ConfirmationFragmentNotice
        continueHref={resolveReturnPath(rawNext)}
        signInHref={ADMIN_LOGIN_PATH}
      />
    </AdminAuthShell>
  )
}
