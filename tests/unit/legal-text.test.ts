import { describe, expect, it } from "vitest"

import { DEFAULT_LEGAL_DOCUMENTS } from "@/lib/legal/default-documents"
import { LEGAL_DOCUMENTS, LEGAL_LIMITS, legalDocumentBySlug } from "@/lib/legal/legal-documents"
import {
  LEGAL_PLACEHOLDERS,
  fillPlaceholders,
  parseLegalBody,
  parseSpans,
  sectionAnchor,
  type LegalPlaceholderValues,
} from "@/lib/legal/legal-text"

const values: LegalPlaceholderValues = {
  businessName: "EGO-Lines Automotive",
  legalName: "EGO-Lines Automotive Co. Ltd",
  website: "https://example.com/",
  email: "info@example.com",
  phone: "+211 900 000 000",
  whatsapp: "+211900000000",
  address: "Juba, South Sudan",
  initialPercent: 50,
  mombasaPercent: 25,
  finalPercent: 25,
}

describe("parseLegalBody", () => {
  it("joins wrapped lines into one paragraph and splits on blank lines", () => {
    expect(parseLegalBody("First line\ncontinues here.\n\nSecond paragraph.")).toEqual([
      { kind: "paragraph", spans: [{ text: "First line continues here.", bold: false }] },
      { kind: "paragraph", spans: [{ text: "Second paragraph.", bold: false }] },
    ])
  })

  it("reads bullets and numbered steps, and separates the two", () => {
    const blocks = parseLegalBody("Intro:\n- one\n• two\n1. first\n2) second")
    expect(blocks.map((block) => block.kind)).toEqual(["paragraph", "bullets", "numbered"])
    expect(blocks[1]).toMatchObject({ items: [[{ text: "one" }], [{ text: "two" }]] })
    expect(blocks[2]).toMatchObject({ items: [[{ text: "first" }], [{ text: "second" }]] })
  })

  it("handles Windows line endings and surrounding whitespace", () => {
    expect(parseLegalBody("  A\r\n\r\n  - b  ").map((block) => block.kind)).toEqual(["paragraph", "bullets"])
  })

  it("returns nothing for empty text", () => {
    expect(parseLegalBody("   \n\n ")).toEqual([])
  })

  it("keeps markup as text — it is rendered by React, never as HTML", () => {
    const [block] = parseLegalBody('<script>alert(1)</script> <img src=x onerror="alert(1)">')
    expect(block).toEqual({
      kind: "paragraph",
      spans: [{ text: '<script>alert(1)</script> <img src=x onerror="alert(1)">', bold: false }],
    })
  })
})

describe("parseSpans", () => {
  it("bolds text between double asterisks and leaves an unpaired marker alone", () => {
    expect(parseSpans("Pay **only** into **official** accounts **now")).toEqual([
      { text: "Pay ", bold: false },
      { text: "only", bold: true },
      { text: " into ", bold: false },
      { text: "official", bold: true },
      { text: " accounts **now", bold: false },
    ])
  })
})

describe("fillPlaceholders", () => {
  it("fills every placeholder from Settings", () => {
    expect(
      fillPlaceholders("{{legal_name}} ({{business_name}}) {{initial_payment}}/{{mombasa_payment}}/{{final_payment}} {{website}}", values)
    ).toBe("EGO-Lines Automotive Co. Ltd (EGO-Lines Automotive) 50%/25%/25% example.com")
  })

  it("points to the Contact page, never a blank, when a detail is not set", () => {
    const empty = { ...values, email: "", phone: " ", legalName: "" }
    expect(fillPlaceholders("Email {{email}}, call {{phone}}, {{legal_name}}", empty)).toBe(
      "Email the email address shown on our Contact page, call the telephone number shown on our Contact page, EGO-Lines Automotive"
    )
  })

  it("names the company once until a registered name is entered", () => {
    expect(fillPlaceholders("{{company}}", values)).toBe("EGO-Lines Automotive Co. Ltd, trading as EGO-Lines Automotive")
    expect(fillPlaceholders("{{company}}", { ...values, legalName: "" })).toBe("EGO-Lines Automotive")
    expect(fillPlaceholders("{{company}}", { ...values, legalName: "EGO-Lines Automotive" })).toBe("EGO-Lines Automotive")
  })

  it("shows an uneven split exactly", () => {
    expect(fillPlaceholders("{{initial_payment}}", { ...values, initialPercent: 33.335 })).toBe("33.34%")
  })

  it("leaves an unknown placeholder visible so a typo is noticed", () => {
    expect(fillPlaceholders("{{busines_name}}", values)).toBe("{{busines_name}}")
  })
})

describe("sectionAnchor", () => {
  it("is stable, readable and unique per position", () => {
    expect(sectionAnchor(7, "Vehicle payment schedule")).toBe("7-vehicle-payment-schedule")
    expect(sectionAnchor(2, "Définitions & termes")).toBe("2-definitions-termes")
    expect(sectionAnchor(3, "!!!")).toBe("section-3")
  })
})

describe("the wording the site ships with", () => {
  const known = new Set<string>(LEGAL_PLACEHOLDERS.map((placeholder) => placeholder.token))

  it("covers every document, each reachable by its slug", () => {
    for (const meta of LEGAL_DOCUMENTS) {
      expect(DEFAULT_LEGAL_DOCUMENTS[meta.kind].sections.length).toBeGreaterThan(3)
      expect(legalDocumentBySlug(meta.slug)?.kind).toBe(meta.kind)
    }
  })

  it.each(LEGAL_DOCUMENTS.map((meta) => [meta.label, DEFAULT_LEGAL_DOCUMENTS[meta.kind]] as const))(
    "%s uses only real placeholders and fits the database limits",
    (_label, document) => {
      const texts = [document.title, document.summary, ...document.sections.flatMap((section) => [section.heading, section.body])]
      for (const text of texts) {
        for (const [, token] of text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)) {
          expect(known, `unknown placeholder {{${token}}}`).toContain(token)
        }
      }

      expect(document.title.length).toBeLessThanOrEqual(LEGAL_LIMITS.titleMax)
      expect(document.summary.length).toBeLessThanOrEqual(LEGAL_LIMITS.summaryMax)
      expect(document.sections.length).toBeLessThanOrEqual(LEGAL_LIMITS.sectionsMax)
      for (const section of document.sections) {
        expect(section.heading.length).toBeGreaterThan(0)
        expect(section.heading.length).toBeLessThanOrEqual(LEGAL_LIMITS.headingMax)
        expect(section.body.length).toBeLessThanOrEqual(LEGAL_LIMITS.bodyMax)
      }
    }
  )
})
