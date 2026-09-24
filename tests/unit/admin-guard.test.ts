import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

import { AdminRole } from "@/generated/prisma/enums"
import type { AdminAccess } from "@/lib/auth/dal"

/**
 * Every administrative Server Action is a public POST endpoint: anyone can
 * call it with curl, whatever the dashboard shows or hides (SECURITY.MD §6.2,
 * §13.2). The one thing standing between that request and the database is
 * `authorizePermission` / `authorizeAdmin`, so these tests hold two things:
 *
 *   1. The guard refuses every session state short of a fully signed-in
 *      administrator — signed out, ended or expired, waiting on the two-factor
 *      code, or still owing two-factor setup.
 *   2. Every exported action calls a guard, except the three that are public
 *      by design. A new action added without one fails this file rather than
 *      shipping as an unauthenticated endpoint.
 */

const state = vi.hoisted(() => ({ access: { status: "SIGNED_OUT" } as unknown }))

vi.mock("server-only", () => ({}))
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`)
  },
}))
vi.mock("@/lib/auth/dal", () => ({ getAdminAccess: async () => state.access }))

const { authorizeAdmin, authorizePermission, requirePermission } = await import("@/lib/auth/admin-guard")

const admin = {
  id: "admin-1",
  email: "admin@example.test",
  displayName: "Admin",
  role: AdminRole.ADMIN,
  twoFactorEnabled: true,
}
const session = { id: "session-1", authSessionId: "auth-session-1", createdAt: new Date(), expiresAt: new Date(Date.now() + 3_600_000) }

function withAccess(access: AdminAccess) {
  state.access = access
}

beforeEach(() => withAccess({ status: "SIGNED_OUT" }))

describe("authorizePermission", () => {
  it("refuses a visitor with no session", async () => {
    expect(await authorizePermission("payment:record")).toMatchObject({ ok: false, reason: "UNAUTHENTICATED" })
  })

  it("refuses a session that was ended elsewhere or has expired", async () => {
    withAccess({ status: "SESSION_ENDED", reason: "ENDED" })
    expect((await authorizePermission("order:cancel")).ok).toBe(false)

    withAccess({ status: "SESSION_ENDED", reason: "EXPIRED" })
    expect((await authorizePermission("order:cancel")).ok).toBe(false)
  })

  it("refuses a password-only session that still owes its two-factor code", async () => {
    withAccess({ status: "TWO_FACTOR_REQUIRED", admin })
    expect((await authorizePermission("vehicle:write")).ok).toBe(false)
  })

  it("refuses an administrator who must set up two-factor, unless the action is part of that setup", async () => {
    withAccess({ status: "TWO_FACTOR_SETUP_REQUIRED", admin, session })
    expect(await authorizePermission("settings:write")).toMatchObject({ ok: false, reason: "FORBIDDEN" })
    expect((await authorizeAdmin({ allowTwoFactorSetup: true })).ok).toBe(true)
  })

  it("allows a fully signed-in administrator holding the permission", async () => {
    withAccess({ status: "OK", admin, session })
    expect(await authorizePermission("payment:verify")).toMatchObject({ ok: true, admin: { id: "admin-1" } })
  })
})

describe("requirePermission (pages)", () => {
  it("sends a signed-out visitor to the login page instead of rendering", async () => {
    await expect(requirePermission("customer:read")).rejects.toThrow(/^REDIRECT .*\/login/)
  })

  it("sends a half-authenticated session to the two-factor challenge", async () => {
    withAccess({ status: "TWO_FACTOR_REQUIRED", admin })
    await expect(requirePermission("customer:read")).rejects.toThrow(/^REDIRECT .*two-factor/)
  })
})

describe("every Server Action is guarded", () => {
  /** Public by design, and each protected in its own way instead: sign-in and
   *  reset are rate-limited and never reveal whether an account exists; the
   *  quote request is validated, honeypotted and rate-limited per IP and phone;
   *  redeeming a reset link is authorised by the one-time token Supabase
   *  verifies; accepting a quotation is authorised by its 256-bit share token,
   *  rate-limited per IP, and reaches that one quote only. */
  const PUBLIC_ACTIONS = new Set([
    "signInAction",
    "requestPasswordResetAction",
    "redeemPasswordResetLinkAction",
    "submitQuoteRequestAction",
    "acceptQuoteAction",
  ])
  const GUARD = /\b(authorizePermission|authorizeAdmin|getAdminAccess|getSessionUser)\(/
  const DATABASE = /\b(prisma|tx)\.\w|\.storage\.|supabase\.auth\.(?!getClaims)/

  const actionsDir = join(process.cwd(), "src/lib/actions")
  const actions = readdirSync(actionsDir)
    .filter((file) => file.endsWith(".ts"))
    .flatMap((file) => {
      const source = readFileSync(join(actionsDir, file), "utf8")
      if (!/^["']use server["']/m.test(source)) return []

      const starts = [...source.matchAll(/^export async function (\w+)\s*\(/gm)]
      return starts.map((match, index) => ({
        file,
        name: match[1],
        body: source.slice(match.index + match[0].length, starts[index + 1]?.index ?? source.length),
      }))
    })

  it("finds the actions it is meant to check", () => {
    expect(actions.length).toBeGreaterThan(40)
  })

  it.each(actions.filter((action) => !PUBLIC_ACTIONS.has(action.name)).map((a) => [`${a.file} › ${a.name}`, a] as const))(
    "%s checks authorization before touching data",
    (_label, action) => {
      const guard = action.body.search(GUARD)
      expect(guard, "no authorization call").toBeGreaterThanOrEqual(0)

      const database = action.body.search(DATABASE)
      if (database >= 0) expect(guard, "database or storage used before the guard").toBeLessThan(database)
    }
  )
})
