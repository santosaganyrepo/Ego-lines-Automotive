import { ADMIN_BASE_PATH } from "@/lib/constants/admin-routes"

/**
 * Where a password-reset email's link lands: the reset page, carrying the
 * still-unspent token. The page spends it only when "Continue" is pressed
 * (see redeemPasswordResetLinkAction). Pure, so it is unit-tested.
 */
export function passwordResetLink(origin: string, tokenHash: string): string {
  const url = new URL(`${ADMIN_BASE_PATH}/reset-password`, origin)
  url.searchParams.set("token_hash", tokenHash)
  url.searchParams.set("type", "recovery")
  return url.toString()
}
