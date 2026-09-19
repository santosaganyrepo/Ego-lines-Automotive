import type { VehicleBodyType } from "@/generated/prisma/enums"
import { bodyTypeToParam } from "@/lib/constants/vehicle-options"

/**
 * The browser-safe half of the catalogue's search parameters: the criteria
 * type and the URL builders.
 *
 * Kept apart from `vehicle-search.schema.ts` because that module builds Zod
 * schemas when it is loaded, and any Client Component importing from it —
 * the filter bar only needs `catalogueHref` — pulled all of Zod (about 65KB
 * compressed) into the catalogue's JavaScript. Parsing untrusted input stays
 * on the server, in the schema module, which re-exports everything here so
 * server code keeps a single import.
 *
 * Do not import `zod` (or the schema module) from this file.
 */

/**
 * Just the narrowing part of a catalogue search — what the query layer turns
 * into a where clause. `vehicle-search.schema.ts` proves at compile time
 * that this matches what `vehicleSearchSchema` produces, so the two cannot
 * drift apart.
 */
export interface VehicleSearchCriteria {
  q?: string | undefined
  make?: string | undefined
  model?: string | undefined
  year?: number | undefined
  bodyType?: VehicleBodyType | undefined
}

/** True when at least one narrowing filter is active. */
export function hasActiveSearch(criteria: VehicleSearchCriteria): boolean {
  return Boolean(
    criteria.q || criteria.make || criteria.model || criteria.year || criteria.bodyType
  )
}

/**
 * Rebuilds a catalogue query string from criteria plus an optional page.
 *
 * One builder for the filter bar, the pagination links and the "clear"
 * control, so a filtered page-two link cannot lose its filters while a
 * page-one link keeps them. Keys are emitted in a fixed order and empty
 * values are omitted, so the same search always produces the same URL —
 * which matters for caching and for not showing a customer two addresses for
 * one result set.
 */
export function buildCatalogueQuery(
  criteria: VehicleSearchCriteria,
  page = 1
): string {
  const params = new URLSearchParams()

  // `q` first: it is the control the customer typed into, so it is the one
  // they will recognise when the address bar is truncated on a phone.
  if (criteria.q) params.set("q", criteria.q)
  if (criteria.make) params.set("make", criteria.make)
  if (criteria.model) params.set("model", criteria.model)
  if (criteria.year) params.set("year", String(criteria.year))
  if (criteria.bodyType) params.set("type", bodyTypeToParam(criteria.bodyType))
  // Page one is the default and is left out, so "/cars" and "/cars?page=1"
  // do not become two URLs for the same page.
  if (page > 1) params.set("page", String(page))

  return params.toString()
}

/** `/cars` with the criteria applied. */
export function catalogueHref(criteria: VehicleSearchCriteria, page = 1): string {
  const query = buildCatalogueQuery(criteria, page)

  return query ? `/cars?${query}` : "/cars"
}
