/**
 * The browser-safe half of the parts catalogue's search parameters: the
 * criteria type and the URL builders.
 *
 * Kept apart from `spare-part-search.schema.ts` because that module builds
 * Zod schemas when it is loaded, and a Client Component importing from it —
 * the search box and category rail only need `partCatalogueHref` — pulled all
 * of Zod (about 65KB compressed) into the catalogue's JavaScript. Parsing
 * untrusted input stays on the server, in the schema module, which
 * re-exports everything here so server code keeps a single import.
 *
 * Do not import `zod` (or the schema module) from this file.
 */

/**
 * Just the narrowing part of a parts search — what the query layer turns
 * into a where clause. `spare-part-search.schema.ts` proves at compile time
 * that this matches what `sparePartSearchSchema` produces.
 */
export interface SparePartSearchCriteria {
  q?: string | undefined
  category?: string | undefined
}

/** True when at least one narrowing filter is active. */
export function hasActivePartSearch(criteria: SparePartSearchCriteria): boolean {
  return Boolean(criteria.q || criteria.category)
}

/**
 * Rebuilds a catalogue query string from criteria plus an optional page.
 *
 * One builder for the category rail, the search box, the pagination links and
 * the clear control, so a filtered page-two link cannot lose its filters.
 * Keys are emitted in a fixed order and empty values are omitted, so the same
 * search always produces the same URL — which matters for caching and for not
 * showing a customer two addresses for one result set.
 */
export function buildPartCatalogueQuery(
  criteria: SparePartSearchCriteria,
  page = 1
): string {
  const params = new URLSearchParams()

  if (criteria.category) params.set("category", criteria.category)
  if (criteria.q) params.set("q", criteria.q)
  // Page one is the default and is left out, so "/spare-parts" and
  // "/spare-parts?page=1" do not become two URLs for the same page.
  if (page > 1) params.set("page", String(page))

  return params.toString()
}

/** `/spare-parts` with the criteria applied. */
export function partCatalogueHref(
  criteria: SparePartSearchCriteria,
  page = 1
): string {
  const query = buildPartCatalogueQuery(criteria, page)

  return query ? `/spare-parts?${query}` : "/spare-parts"
}
