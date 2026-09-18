import { beforeEach, describe, expect, it, vi } from "vitest"

import { CountryOfOrigin, PreferredCountry } from "@/generated/prisma/enums"
import { COUNTRY_LABELS, COUNTRY_OPTIONS, PREFERRED_COUNTRY_LABELS } from "@/lib/constants/vehicle-options"

/**
 * "Load more" on /cars and /spare-parts links to the next page number, and
 * the catalogue renders every result from the first page through that one.
 * These pin the query shape that makes that true, and that the ordinary
 * page-at-a-time mode is unchanged.
 */

let findManyArgs: { skip?: number; take?: number }[] = []
let totalRows = 0

function listModel() {
  return {
    count: async () => totalRows,
    findMany: async (args: { skip?: number; take?: number }) => {
      findManyArgs.push({ skip: args.skip, take: args.take })
      return []
    },
  }
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
    vehicle: listModel(),
    sparePart: listModel(),
  },
}))

vi.mock("@/lib/queries/settings.queries", async () => {
  const { DEFAULT_CATALOG_DISPLAY } = await import("@/lib/settings/catalog-display")
  return { getPublicSiteSettings: async () => ({ catalogDisplay: DEFAULT_CATALOG_DISPLAY }) }
})

vi.mock("@/lib/storage/vehicle-media", () => ({ vehiclePhotoPublicUrl: (path: string) => path }))
vi.mock("@/lib/storage/spare-part-media", () => ({ sparePartPhotoPublicUrl: (path: string) => path }))

const { listPublishedVehicles, PUBLIC_VEHICLES_PER_PAGE } = await import("@/lib/queries/public-vehicle.queries")
const { listPublishedSpareParts, PUBLIC_SPARE_PARTS_PER_PAGE } = await import(
  "@/lib/queries/public-spare-part.queries"
)

beforeEach(() => {
  findManyArgs = []
  totalRows = 100
})

describe.each([
  ["vehicles", listPublishedVehicles, PUBLIC_VEHICLES_PER_PAGE],
  ["spare parts", listPublishedSpareParts, PUBLIC_SPARE_PARTS_PER_PAGE],
] as const)("listing %s", (_name, list, perPage) => {
  it("reads every result from the first page through the requested one", async () => {
    await list({ page: 3, through: true })
    expect(findManyArgs).toEqual([{ skip: 0, take: 3 * perPage }])
  })

  it("still reads a single page when not loading cumulatively", async () => {
    await list({ page: 2 })
    expect(findManyArgs[0]).toEqual({ skip: perPage, take: perPage })
  })

  it("clamps a page past the end to the last real page, with no second read", async () => {
    totalRows = perPage + 1
    const result = await list({ page: 9, through: true })

    expect(result.page).toBe(2)
    expect(result.pageCount).toBe(2)
    expect(findManyArgs).toHaveLength(1)
  })
})

describe("sourcing countries", () => {
  it("labels every country a vehicle or part can come from, China included", () => {
    for (const country of Object.values(CountryOfOrigin)) {
      expect(COUNTRY_LABELS[country]).toBeTruthy()
    }
    expect(COUNTRY_OPTIONS.map((option) => option.label)).toEqual(["Japan", "South Korea", "China"])
  })

  it("labels every quote preference, reading the no-preference value as any market", () => {
    for (const preference of Object.values(PreferredCountry)) {
      expect(PREFERRED_COUNTRY_LABELS[preference]).toBeTruthy()
    }
    expect(PREFERRED_COUNTRY_LABELS.EITHER).toBe("Any market")
    expect(PREFERRED_COUNTRY_LABELS.CHINA).toBe("China")
  })
})
