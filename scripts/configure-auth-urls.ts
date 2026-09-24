/**
 * Sets the Supabase project's authentication URLs — the "Site URL" and the
 * "Redirect URLs" allow-list — from the command line.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_… npm run auth:configure-urls -- --site=https://your-domain.com
 *   (add --dry-run to print the change without making it)
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * The password-reset email no longer depends on these settings (the
 * application mints the token and sends the email itself — see
 * src/lib/auth/password-reset-email.ts). Two flows still do: an
 * administrator changing their email address, and an invitation, whose
 * emails Supabase writes. When the address we ask Supabase to link to is not
 * on the allow-list, Supabase silently uses the Site URL instead — which is
 * how links to `localhost:8000` were sent. Setting both here, from one
 * command, makes that impossible to get half-right in the dashboard.
 *
 * ── What it writes ───────────────────────────────────────────────────────
 *   Site URL      → the live domain (--site, or NEXT_PUBLIC_SITE_URL when it
 *                   is a public https:// address)
 *   Redirect URLs → what is already there, plus:
 *                     <site>/auth/confirm**, <site>/auth/callback**
 *                     http://localhost:3000/auth/confirm** (local work)
 *                     this Codespace's forwarded address, when run in one
 *                   Exact origins only — never a wildcard host, which would
 *                   let a link carry a live token to someone else's server.
 *
 * SUPABASE_ACCESS_TOKEN is a personal access token (Supabase → Account →
 * Access Tokens). It is a secret with power over every project in the
 * account: pass it for this one command, do not store it in .env files, and
 * revoke it afterwards if it was created only for this. It is never printed.
 */

import { config } from "dotenv"
import { existsSync } from "node:fs"

if (existsSync(".env.local")) {
  config({ path: ".env.local", quiet: true })
}

import { publicOriginProblem } from "../src/lib/utils/site-url"

const MANAGEMENT_API = "https://api.supabase.com/v1"

function argument(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length)
}

function projectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const match = url ? /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/.exec(url.trim()) : null
  if (!match?.[1]) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be the project's https://<ref>.supabase.co address.")
  }
  return match[1]
}

function requiredRedirects(site: string): string[] {
  const entries = [`${site}/auth/confirm**`, `${site}/auth/callback**`, "http://localhost:3000/auth/confirm**"]
  const codespace = process.env.CODESPACE_NAME
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
  if (codespace && domain) entries.push(`https://${codespace}-3000.${domain}/auth/confirm**`)
  return entries
}

async function main(): Promise<number> {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
  if (!token) {
    console.error("Set SUPABASE_ACCESS_TOKEN (Supabase → Account → Access Tokens) for this command.")
    return 1
  }

  const site = (argument("site") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "")
  const problem = publicOriginProblem(site)
  if (problem) {
    console.error(`The site address "${site || "(none)"}" ${problem}. Pass --site=https://your-live-domain.`)
    return 1
  }

  const endpoint = `${MANAGEMENT_API}/projects/${projectRef()}/config/auth`
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }

  const current = await fetch(endpoint, { headers })
  if (!current.ok) {
    console.error(`Could not read the project's auth settings (HTTP ${current.status}). Check the token and project.`)
    return 1
  }
  const settings = (await current.json()) as { site_url?: string; uri_allow_list?: string }

  const existing = (settings.uri_allow_list ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
  const allowList = [...new Set([...existing, ...requiredRedirects(site)])]

  console.log(`Site URL:      ${settings.site_url ?? "(unset)"}  →  ${site}`)
  console.log("Redirect URLs:")
  for (const entry of allowList) console.log(`  ${existing.includes(entry) ? " " : "+"} ${entry}`)

  if (process.argv.includes("--dry-run")) {
    console.log("\nDry run — nothing changed.")
    return 0
  }

  const updated = await fetch(endpoint, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ site_url: site, uri_allow_list: allowList.join(",") }),
  })
  if (!updated.ok) {
    console.error(`Supabase refused the change (HTTP ${updated.status}).`)
    return 1
  }

  console.log("\nSaved. Supabase's own emails now link to the live site.")
  return 0
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error("Could not configure the authentication URLs:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
)
