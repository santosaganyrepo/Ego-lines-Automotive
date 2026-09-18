import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { BRAND_LOGO_SOURCES, VEHICLE_BRANDS, brandLogoSrc } from "@/config/brands"

const PUBLIC_DIR = path.join(process.cwd(), "public")

function logoFile(src: string): string {
  return readFileSync(path.join(PUBLIC_DIR, src), "utf8")
}

/**
 * The brands grid is data plus static files; these keep the two in step, and
 * keep the files safe to serve from our own origin.
 */
describe("vehicle brands", () => {
  it("lists every make the business named, once each", () => {
    const names = VEHICLE_BRANDS.map((brand) => brand.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual([
      "Toyota", "Lexus", "Nissan", "Honda", "Mazda", "Mitsubishi", "Subaru", "Suzuki", "Isuzu",
      "Hyundai", "Kia", "BYD", "Geely", "Changan", "Haval",
    ])
  })

  it.each(VEHICLE_BRANDS.map((brand) => [brand.name, brand] as const))("%s has a logo file", (_name, brand) => {
    expect(existsSync(path.join(PUBLIC_DIR, brandLogoSrc(brand)))).toBe(true)
  })

  it.each(VEHICLE_BRANDS.map((brand) => [brand.name, brand] as const))(
    "%s declares the aspect ratio of its artwork",
    (_name, brand) => {
      const viewBox = logoFile(brandLogoSrc(brand)).match(/viewBox="([^"]+)"/)
      expect(viewBox).not.toBeNull()
      const [, , width, height] = viewBox![1].trim().split(/[\s,]+/).map(Number)
      expect(brand.ratio).toBeCloseTo(width / height, 1)
    }
  )

  it.each(VEHICLE_BRANDS.map((brand) => [brand.name, brand] as const))(
    "%s carries no script, event handler or external reference",
    (_name, brand) => {
      const svg = logoFile(brandLogoSrc(brand))
      expect(svg).not.toMatch(/<script|<foreignObject|\son[a-z]+\s*=|javascript:|href="(?!#)/i)
    }
  )

  it("records where every logo came from", () => {
    for (const brand of VEHICLE_BRANDS) {
      expect(BRAND_LOGO_SOURCES[brand.slug]).toBeTruthy()
    }
  })
})
