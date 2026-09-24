import { describe, expect, it } from "vitest"

import { publicOriginProblem, resolveSiteUrl } from "@/lib/utils/site-url"
import { passwordResetLink } from "@/lib/auth/password-reset-link"

/**
 * Every link in every email is built on this origin. The dealership was sent
 * a password reset to `http://localhost:300`; these are the rules that make
 * that impossible (src/lib/utils/site-url.ts).
 */

const CODESPACE = { CODESPACE_NAME: "fuzzy-space", GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev" }

describe("resolveSiteUrl", () => {
  it("uses a public https NEXT_PUBLIC_SITE_URL as written, without a trailing slash", () => {
    expect(resolveSiteUrl({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://www.example.com/" })).toBe(
      "https://www.example.com"
    )
  })

  it("ignores a localhost value copied into a Vercel production deployment", () => {
    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "crownline.example.com",
        NEXT_PUBLIC_SITE_URL: "http://localhost:300",
      })
    ).toBe("https://crownline.example.com")
  })

  it("uses the branch address on a Vercel preview", () => {
    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "crownline-git-feature.vercel.app",
        VERCEL_URL: "crownline-abc123.vercel.app",
      })
    ).toBe("https://crownline-git-feature.vercel.app")
  })

  it("uses the forwarded Codespace address in development instead of localhost", () => {
    expect(resolveSiteUrl({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://localhost:3000", ...CODESPACE })).toBe(
      "https://fuzzy-space-3000.app.github.dev"
    )
  })

  it("follows the port the dev server is on in a Codespace", () => {
    expect(resolveSiteUrl({ NODE_ENV: "development", PORT: "3001", ...CODESPACE })).toBe(
      "https://fuzzy-space-3001.app.github.dev"
    )
  })

  it("keeps localhost for plain local development", () => {
    expect(resolveSiteUrl({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" })).toBe(
      "http://localhost:3000"
    )
    expect(resolveSiteUrl({ NODE_ENV: "development" })).toBe("http://localhost:3000")
  })

  it("never uses a Codespace address for a production build", () => {
    expect(resolveSiteUrl({ NODE_ENV: "production", ...CODESPACE })).toBe("https://crownlinemotors.com")
  })
})

describe("publicOriginProblem", () => {
  it.each([
    ["http://localhost:8000", "is not an https:// address"],
    ["https://localhost:3000", "points at this machine (localhost)"],
    ["https://127.0.0.1", "points at this machine (localhost)"],
    ["https://fuzzy-space-3000.app.github.dev", "points at a Codespace"],
    ["not a url", "is not a valid URL"],
  ])("refuses %s", (origin, problem) => {
    expect(publicOriginProblem(origin)).toBe(problem)
  })

  it("accepts a public https origin", () => {
    expect(publicOriginProblem("https://www.example.com")).toBeNull()
  })
})

describe("passwordResetLink", () => {
  it("opens the reset page with the unspent token, on the given origin", () => {
    const link = new URL(passwordResetLink("https://www.example.com", "abc123def4567890"))
    expect(link.origin).toBe("https://www.example.com")
    expect(link.pathname).toMatch(/\/reset-password$/)
    expect(link.searchParams.get("token_hash")).toBe("abc123def4567890")
    expect(link.searchParams.get("type")).toBe("recovery")
  })
})
