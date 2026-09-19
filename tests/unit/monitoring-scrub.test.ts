import { describe, expect, it } from "vitest"

import { scrubEvent, scrubText, scrubUrl } from "@/lib/monitoring/scrub"

/**
 * Error reports leave the deployment for Sentry, so nothing personal or secret
 * may ride along (SECURITY.MD §38). These pin what the scrubber removes.
 */
describe("scrubText", () => {
  it("redacts emails, phone numbers and credentials", () => {
    const text = scrubText(
      "Invalid prisma.customer.create() { email: 'mary.akol@example.com', phone: '+211 912 345 678' } Bearer abc.def-ghi sb_secret_abcdefghijklmno"
    )
    expect(text).not.toMatch(/mary\.akol|912 345|abc\.def|sb_secret_abcdefgh/)
    expect(text).toContain("[email]")
    expect(text).toContain("[phone]")
    expect(text).toContain("Bearer [redacted]")
    expect(text).toContain("[secret]")
  })

  it("redacts a quotation link's token but keeps short numbers such as years and prices", () => {
    expect(scrubText("GET /quotation/AbCdEfGhIjKlMnOpQrStUv")).toBe("GET /quotation/[token]")
    expect(scrubText("2021 Toyota Harrier, $22,500")).toBe("2021 Toyota Harrier, $22,500")
  })
})

describe("scrubUrl", () => {
  it("drops query strings, where tracking numbers and searches live", () => {
    expect(scrubUrl("https://site.example/track-my-order?number=CLM-2026-000125#x")).toBe("https://site.example/track-my-order")
  })
})

describe("scrubEvent", () => {
  it("removes cookies, bodies, sensitive headers and user details", () => {
    const event = scrubEvent({
      message: "failed for john@example.com",
      request: {
        url: "https://site.example/get-a-quote?name=John",
        query_string: "name=John",
        cookies: { "sb-access-token": "x" },
        data: { fullName: "John Deng", phone: "+211900000000" },
        headers: { "user-agent": "UA", cookie: "sb=1", authorization: "Bearer t", referer: "https://site.example/x?y=1" },
      },
      user: { id: "admin-1", email: "a@b.co", ip_address: "10.0.0.1" },
      exception: { values: [{ value: "Customer +211 900 000 000 not found" }] },
      breadcrumbs: [{ message: "fetch", data: { url: "/track-my-order?number=CLM-2026-000125", endpoint: "https://fcm.googleapis.com/x" } }],
    })

    expect(event.message).toBe("failed for [email]")
    expect(event.request).toEqual({ url: "https://site.example/get-a-quote", headers: { "user-agent": "UA", referer: "https://site.example/x" } })
    expect(event.user).toEqual({ id: "admin-1" })
    expect(event.exception?.values?.[0]?.value).toBe("Customer [phone] not found")
    expect(event.breadcrumbs?.[0]?.data).toEqual({ url: "/track-my-order", endpoint: "[redacted]" })
  })
})
