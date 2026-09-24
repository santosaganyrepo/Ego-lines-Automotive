import { type NextRequest } from "next/server"

import { handleConfirmationLink } from "@/lib/auth/confirm-link"

/**
 * Exchanges a one-time email token for a session.
 *
 * Every Supabase authentication email — password recovery, the invitation
 * that provisions a new administrator, and the confirmation of an email
 * change — links back here. What the link actually carries depends on how
 * the template in the Supabase dashboard is written, so the handling lives in
 * `lib/auth/confirm-link.ts`, which covers every shape and is shared with
 * `/auth/callback`. See that file for the reasoning.
 *
 * `force-dynamic`: this reads a query string and writes session cookies, and
 * must never be prerendered or held in a shared cache.
 */
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleConfirmationLink(request)
}
