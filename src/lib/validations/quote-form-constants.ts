/**
 * Constants the public quote form shares with the server's validation.
 *
 * Kept apart from `quote.schema.ts` because that module builds Zod schemas
 * when it is loaded: importing these two values from it put all of Zod
 * (about 65KB compressed) into the JavaScript of every page carrying the
 * quote form. The schema module re-exports both.
 *
 * Do not import `zod` (or the schema module) from this file.
 */

/** Customer notes. Long enough for a real requirement, short enough that a
 *  single request cannot fill an operator's screen. */
export const QUOTE_NOTES_MAX = 2000

/**
 * The name of the form's honeypot field.
 *
 * Rendered off-screen and out of the tab order, so a person never fills it
 * and a form-filling bot usually does. A non-empty value is answered with the
 * same neutral confirmation a real request gets and nothing is stored — a bot
 * told "rejected" simply learns which field to leave blank.
 *
 * Deliberately a name no browser autofill heuristic maps to a personal field
 * ("website", "company" and "nickname" all get filled by some password
 * managers, which would silently discard a real customer's request).
 */
export const QUOTE_HONEYPOT_FIELD = "crownline_confirm_hp"
