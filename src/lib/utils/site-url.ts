/**
 * The site's public origin, and the one place it is decided.
 *
 * Every absolute link the application writes — canonical URLs, the sitemap,
 * structured data, and above all the links inside emails (password resets,
 * quotations, "accept this quotation", tracking updates) — is built on this.
 * A wrong answer does not fail loudly: it sends a customer or an
 * administrator a link to "This site can't be reached", which is how the
 * dealership met it (`http://localhost:300` in a password-reset email).
 *
 * So the rules are written down, in order, and each comes from the platform
 * rather than from a request header (a forged Host would otherwise put an
 * attacker's domain into a genuine reset email):
 *
 *   1. NEXT_PUBLIC_SITE_URL, when it is a public https:// address. The live
 *      domain, set once in Vercel.
 *   2. On Vercel, the deployment's own address, which Vercel sets on every
 *      build: the production domain for production, the branch URL for a
 *      preview. A NEXT_PUBLIC_SITE_URL copied across from `.env.local`
 *      (localhost) is ignored here rather than mailed to customers.
 *   3. In a GitHub Codespace, the forwarded https://…app.github.dev address
 *      of the dev server. `localhost` in a Codespace only exists for the
 *      editor on the desktop; the phone or browser a reset email is opened in
 *      cannot reach it.
 *   4. NEXT_PUBLIC_SITE_URL as written (plain local development).
 *   5. http://localhost:<port> in development; the original domain otherwise.
 *
 * Pure: the environment is a parameter, so every rule is unit-tested
 * (tests/unit/site-url.test.ts).
 */

export type SiteUrlEnv = Readonly<Record<string, string | undefined>>

const FALLBACK_PRODUCTION_ORIGIN = "https://crownlinemotors.com"
const DEFAULT_DEV_PORT = 3000

function toOrigin(value: string | undefined): URL | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
}

/** Scheme, host and port only: a site URL with a path would break every link built on it. */
function withoutTrailingSlash(url: URL): string {
  return url.origin
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0"
  )
}

/** Why an origin cannot go into an email or a canonical tag, or null when it can. */
export function publicOriginProblem(origin: string): string | null {
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return "is not a valid URL"
  }
  if (url.protocol !== "https:") return "is not an https:// address"
  if (isLoopback(url.hostname)) return "points at this machine (localhost)"
  if (url.hostname.endsWith(".app.github.dev")) return "points at a Codespace"
  return null
}

function vercelOrigin(env: SiteUrlEnv): URL | null {
  const onVercel = env.VERCEL === "1" || Boolean(env.NEXT_PUBLIC_VERCEL_ENV)
  if (!onVercel) return null

  const environment = env.VERCEL_ENV ?? env.NEXT_PUBLIC_VERCEL_ENV
  if (environment === "production") {
    return toOrigin(env.VERCEL_PROJECT_PRODUCTION_URL ?? env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL)
  }
  return (
    toOrigin(env.VERCEL_BRANCH_URL ?? env.NEXT_PUBLIC_VERCEL_BRANCH_URL) ??
    toOrigin(env.VERCEL_URL ?? env.NEXT_PUBLIC_VERCEL_URL)
  )
}

function codespaceOrigin(env: SiteUrlEnv, configured: URL | null): URL | null {
  const name = env.CODESPACE_NAME?.trim()
  const domain = env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN?.trim()
  if (!name || !domain) return null

  // The port the dev server is on: the one written in a localhost
  // NEXT_PUBLIC_SITE_URL, else the one `next dev` bound, else its default.
  const configuredPort = configured && isLoopback(configured.hostname) ? Number(configured.port) : NaN
  const envPort = Number.parseInt(env.PORT ?? "", 10)
  const port = Number.isInteger(configuredPort) && configuredPort > 0
    ? configuredPort
    : Number.isInteger(envPort) && envPort > 0
      ? envPort
      : DEFAULT_DEV_PORT

  return toOrigin(`https://${name}-${port}.${domain}`)
}

export function resolveSiteUrl(env: SiteUrlEnv): string {
  const configured = toOrigin(env.NEXT_PUBLIC_SITE_URL)

  if (configured && !publicOriginProblem(withoutTrailingSlash(configured))) {
    return withoutTrailingSlash(configured)
  }

  const vercel = vercelOrigin(env)
  if (vercel) return withoutTrailingSlash(vercel)

  if (env.NODE_ENV !== "production") {
    const codespace = codespaceOrigin(env, configured)
    if (codespace) return withoutTrailingSlash(codespace)
  }

  if (configured) return withoutTrailingSlash(configured)

  if (env.NODE_ENV !== "production") {
    return `http://localhost:${Number.parseInt(env.PORT ?? "", 10) || DEFAULT_DEV_PORT}`
  }
  return FALLBACK_PRODUCTION_ORIGIN
}
