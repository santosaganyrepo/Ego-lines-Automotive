import { type NextRequest } from "next/server"

import { handleConfirmationLink } from "@/lib/auth/confirm-link"

/**
 * An alias for `/auth/confirm`.
 *
 * Which path a Supabase authentication email returns to is set in the
 * Supabase dashboard — in the email template and the redirect allow-list —
 * not here, and `/auth/callback` is the path Supabase's own documentation and
 * starter templates use. A project configured that way against an app that
 * only serves `/auth/confirm` gives the administrator a bare 404 with nothing
 * to act on, which is what the email-change link was doing.
 *
 * Both paths run exactly the same handler, so neither can drift from the
 * other or become the one that quietly stopped being maintained.
 */
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleConfirmationLink(request)
}
