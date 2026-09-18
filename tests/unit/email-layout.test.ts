import { describe, expect, it } from "vitest"

import { renderEmailHtml, renderEmailText, safeHttpUrl, type EmailContent } from "@/lib/email/email-layout"

const BRAND = { siteName: "EGO-Lines Automotive", siteUrl: "https://ego-lines.example" }

const CONTENT: EmailContent = {
  preheader: "Your request has been received",
  heading: "We have received your request",
  greeting: "Hello <b>Santos</b>,",
  paragraphs: ['Notes: <script>alert("x")</script>'],
  details: [{ label: "Reference", value: "CLM-Q-2026-000045" }],
  callToAction: { label: "Track my order", url: "https://ego-lines.example/track-my-order" },
}

describe("renderEmailHtml", () => {
  it("escapes every value a customer could have typed", () => {
    const html = renderEmailHtml(CONTENT, BRAND)

    expect(html).not.toContain("<script>")
    expect(html).not.toContain("<b>Santos</b>")
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;")
  })

  it("drops a call to action that is not an http(s) link", () => {
    const html = renderEmailHtml({ ...CONTENT, callToAction: { label: "Open", url: "javascript:alert(1)" } }, BRAND)

    expect(html).not.toContain("javascript:")
  })
})

describe("renderEmailText", () => {
  it("renders the same details and link as plain text", () => {
    const text = renderEmailText(CONTENT, BRAND)

    expect(text).toContain("Reference: CLM-Q-2026-000045")
    expect(text).toContain("Track my order: https://ego-lines.example/track-my-order")
    expect(text.endsWith("EGO-Lines Automotive\nhttps://ego-lines.example")).toBe(true)
  })
})

describe("safeHttpUrl", () => {
  it("allows only http and https", () => {
    expect(safeHttpUrl("https://example.com/a")).toBe("https://example.com/a")
    expect(safeHttpUrl("mailto:someone@example.com")).toBeNull()
    expect(safeHttpUrl("not a url")).toBeNull()
  })
})
