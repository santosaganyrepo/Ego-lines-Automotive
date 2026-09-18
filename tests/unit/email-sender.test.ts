import { afterEach, describe, expect, it, vi } from "vitest"

import { getEmailFromAddress } from "@/lib/email/resend-client"

/**
 * The sender a customer sees is the business name from Settings, so renaming
 * the business renames every email's "From" without a deploy.
 */
describe("getEmailFromAddress", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("names the sandbox sender after the business when no address is configured", () => {
    vi.stubEnv("EMAIL_FROM_ADDRESS", "")
    expect(getEmailFromAddress("EGO-Lines Automotive")).toBe('"EGO-Lines Automotive" <onboarding@resend.dev>')
  })

  it("follows a rename in Settings", () => {
    vi.stubEnv("EMAIL_FROM_ADDRESS", "")
    expect(getEmailFromAddress("A New Name")).toBe('"A New Name" <onboarding@resend.dev>')
  })

  it("puts the business name in front of a bare configured address", () => {
    vi.stubEnv("EMAIL_FROM_ADDRESS", "quotes@example.com")
    expect(getEmailFromAddress("EGO-Lines Automotive")).toBe('"EGO-Lines Automotive" <quotes@example.com>')
  })

  it("leaves a configured address that already carries a display name untouched", () => {
    vi.stubEnv("EMAIL_FROM_ADDRESS", "Sales Desk <sales@example.com>")
    expect(getEmailFromAddress("EGO-Lines Automotive")).toBe("Sales Desk <sales@example.com>")
  })

  it("cannot be used to rewrite the header", () => {
    vi.stubEnv("EMAIL_FROM_ADDRESS", "")
    const from = getEmailFromAddress('Evil" <attacker@example.com>\r\nBcc: victim@example.com')

    expect(from).not.toMatch(/[\r\n]/)
    expect(from.match(/</g)).toHaveLength(1)
    expect(from.endsWith("<onboarding@resend.dev>")).toBe(true)
  })

  it("falls back to the bare address when the name is nothing but unsafe characters", () => {
    vi.stubEnv("EMAIL_FROM_ADDRESS", "")
    expect(getEmailFromAddress('<>"')).toBe("onboarding@resend.dev")
  })
})
