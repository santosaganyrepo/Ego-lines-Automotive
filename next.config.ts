import type { NextConfig } from "next";
import { PHASE_PRODUCTION_SERVER } from "next/constants";
import { withSentryConfig } from "@sentry/nextjs/config";
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";

/**
 * Baseline security headers (SECURITY.MD §25, §26).
 *
 * The Content-Security-Policy is built separately, in
 * `contentSecurityPolicy()` below, and sent with the framing headers.
 */
const baseSecurityHeaders = [
  {
    // Two years, subdomains included, preload-eligible. Cloudflare and
    // Vercel both terminate TLS in front of this app, so the header is
    // about instructing browsers never to try HTTP again — not about
    // redirecting, which the platform already handles.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Stops a browser second-guessing a declared Content-Type. Relevant the
    // moment customer-uploaded vehicle photos and payment receipts are
    // served (Stage 9): a file claiming to be an image must never be
    // sniffed into being executed as script.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Send the full URL only to our own origin. Cross-origin requests get
    // the bare origin, so a tracking reference or an admin path never
    // travels in a Referer header to a third party.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Nothing in this application uses these, and denying them means a
    // compromised embedded script cannot start. (`interest-cohort` — Google's
    // cancelled FLoC trial — was removed: browsers now log it as an
    // unrecognised feature on every page.)
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/**
 * Framing protection.
 *
 * `frame-ancestors` is the CSP directive that supersedes X-Frame-Options,
 * but not every browser and scanner honours a lone CSP, so both are sent.
 * The CSP here is the full policy, of which `frame-ancestors` is one part.
 */
const framingHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy("'none'") },
];

/**
 * Content-Security-Policy (SECURITY.MD §24).
 *
 * The "without nonces" policy from the Next.js CSP guide
 * (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * A nonce policy would force every page to render per request — the
 * prerendered pages (About, Contact, How It Works…) would lose their static
 * delivery — so scripts are limited by origin instead:
 *
 *   - script-src 'self' 'unsafe-inline': Next.js ships its bootstrap and
 *     page data as inline scripts, and the pages carry JSON-LD. No script may
 *     load from any other origin, so injected markup cannot pull in an
 *     attacker's script file.
 *   - connect-src 'self': the browser talks only to this site. Supabase is
 *     reached from the server, never from the browser, so it is not listed —
 *     which also means stolen page data has nowhere to be sent.
 *   - img-src: next/image serves photographs from this origin; `data:` is the
 *     two-factor QR code, `blob:` the dashboard's upload previews, and the
 *     Supabase origin is the storage the photographs come from.
 *   - frame-src 'self': nothing frames another origin; kept explicit so a
 *     future embed has to be added here deliberately.
 *   - object-src 'none', base-uri 'self', form-action 'self': no plugins, no
 *     <base> hijacking, and forms may only post to this site.
 *
 * Adding a third-party service (Sentry, analytics, a map embed) means adding
 * its origin to the matching directive here — a blocked request is reported
 * in the browser console as a CSP violation naming the directive.
 *
 * `upgrade-insecure-requests` is deliberately absent: HSTS above already keeps
 * browsers on HTTPS, and the directive would break `next start` on
 * http://localhost. Development adds 'unsafe-eval', which React's dev build
 * needs for its error overlays; production never sends it.
 */
function contentSecurityPolicy(frameAncestors: "'none'"): string {
  const supabaseOrigin = (() => {
    try {
      return process.env.NEXT_PUBLIC_SUPABASE_URL
        ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
        : "";
    } catch {
      return "";
    }
  })();
  const isDev = process.env.NODE_ENV === "development";

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}

/**
 * Cache-Control for admin and auth routes is deliberately NOT set here.
 * Next.js writes its own `Cache-Control` onto dynamic responses, and that
 * value overrides anything configured in this file. The directive is applied
 * in src/lib/supabase/proxy.ts instead, which runs last and therefore wins.
 */

/**
 * Origins permitted to invoke Server Actions, beyond the app's own.
 *
 * Next.js defends Server Actions against CSRF by comparing the request's
 * `Origin` header against `X-Forwarded-Host` (falling back to `Host`) and
 * rejecting mismatches with "Invalid Server Actions request". That is a
 * genuine security control, and its default — same-origin only — is right.
 *
 * A GitHub Codespace breaks that comparison without breaking the security
 * property, because the two headers come from different places:
 *
 *   - `Origin` is whatever the browser has in its address bar. With desktop
 *     VS Code port forwarding that is `localhost:3000`; in the browser
 *     editor it is the public `…app.github.dev` host.
 *   - `X-Forwarded-Host` is stamped by the Codespaces tunnel, and is the
 *     public host in *both* cases.
 *
 * So the pair disagrees whenever the browser is on localhost, and every
 * sign-in and password-reset submission is rejected as forged.
 *
 * `allowedOrigins` is matched against the ORIGIN host, not the forwarded
 * host (see isCsrfOriginAllowed in next/dist/server/app-render/
 * csrf-protection.js) — and it compares `new URL(origin).host`, so the port
 * is part of the value. Both browsing routes are legitimate during
 * development, so both origins are listed.
 *
 * Everything here is development-only. The production guard is
 * belt-and-braces: these variables should never exist in a deployment, and
 * if they somehow did, loosening CSRF on the live admin dashboard is not a
 * failure mode worth risking. Never widen this to a bare wildcard, and never
 * add a domain the project does not control — an entry here is permission
 * for that origin to submit forms as a signed-in administrator.
 */
function developmentServerActionOrigins(phase: string): string[] | undefined {
  const inCodespace = process.env.CODESPACES === "true";

  if (process.env.NODE_ENV === "production") {
    /**
     * Production keeps Next's default — same-origin only — and that is not
     * negotiable. But a production server *inside* a Codespace hits the same
     * header mismatch with no allowlist to rescue it, and the resulting
     * "Invalid Server Actions request" looks like an application fault
     * rather than a browsing-address problem. Say which it is.
     */
    if (inCodespace && phase === PHASE_PRODUCTION_SERVER) {
      console.warn(
        "[next.config] Production server inside a Codespace. Server Actions " +
          "sent from http://localhost will be rejected as cross-origin, " +
          "because the tunnel stamps x-forwarded-host with the public " +
          "*.app.github.dev host. Browse the forwarded https://…app.github.dev " +
          "URL instead — or use `npm run dev`, which allows both."
      );
    }

    return undefined;
  }

  const codespace = process.env.CODESPACE_NAME;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

  if (!codespace || !domain) {
    /**
     * Say so, rather than returning undefined quietly. Without the allowlist
     * every Server Action in a Codespace aborts, and tracing that back to a
     * missing environment variable costs an afternoon. One line at startup
     * turns it into a one-line diagnosis.
     */
    if (inCodespace) {
      console.warn(
        "[next.config] Running in a Codespace, but CODESPACE_NAME / " +
          "GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN are not set in this " +
          "process. Server Actions will be rejected as cross-origin. Start " +
          "the dev server from a terminal where both are exported."
      );
    }

    return undefined;
  }

  /**
   * Ports, not a port.
   *
   * `next dev` moves to the next free port when 3000 is taken — by a
   * leftover server from an earlier session, most often — printing
   * "Port 3000 is in use ... using available port 3001 instead" and then
   * setting PORT to what it actually bound. The browser follows it and sends
   * `Origin: localhost:3001`, which a list containing only :3000 does not
   * match, and *every* Server Action starts failing with a CSRF abort that
   * has nothing to do with whatever was last changed.
   *
   * The bound port is not knowable with certainty here — this file is
   * evaluated as the server starts — so PORT seeds the list and the small
   * range `next dev` actually walks is included regardless.
   *
   * Widening it this way costs nothing in reach: every entry is either a
   * loopback address, which only this machine can originate, or a forwarded
   * host on the Codespace this code is running inside. It is still an
   * allowlist of exact `host:port` values — `localhost:9999` and
   * `localhost.attacker.example` both fail it.
   */
  const seed = Number.parseInt(process.env.PORT ?? "", 10);
  const walked = Array.from({ length: 10 }, (_, index) => 3000 + index);
  const seeded = Number.isFinite(seed)
    ? Array.from({ length: 3 }, (_, index) => seed + index)
    : [];

  const ports = [...new Set([...walked, ...seeded])];

  // Host only, no protocol — the shape `allowedOrigins` expects, and what
  // Next compares `new URL(origin).host` against (see isCsrfOriginAllowed in
  // next/dist/server/app-render/csrf-protection.js), so the port is part of
  // the value.
  return ports.flatMap((port) => [
    `${codespace}-${port}.${domain}`, // browser editor / forwarded URL
    `localhost:${port}`, // desktop VS Code port forwarding
    `127.0.0.1:${port}`, // same, when the browser resolves it numerically
  ]);
}

/**
 * Maximum Server Action request body.
 *
 * Next.js defaults this to 1MB, which is a sensible floor for form posts and
 * far too small for the one action that carries files: vehicle photograph
 * upload. Those bytes reach the server through a Server Action rather than a
 * browser-to-Supabase upload, because the storage bucket grants no write
 * access to any browser session — see src/lib/storage/vehicle-media.ts.
 *
 * The value must stay above MAX_UPLOAD_BATCH_BYTES in
 * src/lib/constants/vehicle-photo-options.ts (16MB), with headroom for the
 * multipart boundaries and part headers that do not count towards that
 * limit. Raise the two together, never one alone: a larger batch limit with
 * this value unchanged fails at the framework boundary, before the action's
 * own validation can produce a message anyone can act on.
 *
 * In practice a batch is nowhere near this: the dashboard re-encodes every
 * photograph in the browser before it is sent (see downscale-photo.ts), so a
 * full twelve-image walk-around is a few megabytes rather than sixty. This
 * ceiling is what an un-downscaled fallback is allowed to reach, not what a
 * normal upload weighs.
 */
const SERVER_ACTION_BODY_LIMIT = "20mb";

/**
 * Where remotely-hosted images may come from.
 *
 * Vehicle photographs are served from the project's Supabase Storage origin,
 * which varies per environment, so the host is derived from the same
 * variable the storage layer uses rather than hard-coded. `next/image`
 * refuses any origin not listed here, which is what stops the optimiser from
 * being used as an open proxy for arbitrary remote URLs.
 *
 * The path is narrowed to the public object route: nothing else on a
 * Supabase origin is an image we serve.
 */
function supabaseImagePatterns(): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) return [];

  try {
    const { protocol, hostname } = new URL(url);

    return [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    // A malformed value is a configuration error, not a reason to fail the
    // build — images simply will not load, which is the visible symptom that
    // leads someone to the variable.
    console.warn(
      "[next.config] NEXT_PUBLIC_SUPABASE_URL is not a valid URL; remote images are disabled."
    );
    return [];
  }
}

/**
 * Crawlers that are sent every metadata tag inside <head>.
 *
 * Next.js streams `generateMetadata` output: the page starts rendering at
 * once and the tags arrive later, appended to <body>. Its default list of
 * "HTML-limited" bots — the ones that instead wait for a complete <head> —
 * covers Bingbot, the link-preview fetchers and Google's *auxiliary*
 * crawlers, but not Googlebot itself, nor any AI crawler. Googlebot does
 * render JavaScript, but its first pass reads the raw HTML, and the title,
 * canonical and robots tags are exactly what that pass is for; the AI
 * crawlers never render at all. So both are added to the default list here.
 * Visitors are unaffected — only these user agents wait for the metadata.
 */
const SEO_CRAWLER_UA_RE = new RegExp(
  [
    HTML_LIMITED_BOT_UA_RE.source,
    "Googlebot",
    "GPTBot|OAI-SearchBot|ChatGPT-User",
    "ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai",
    "PerplexityBot|Perplexity-User",
    "Amazonbot|CCBot|Meta-ExternalAgent|DuckAssistBot|MistralAI-User|cohere-ai",
  ].join("|"),
  "i"
);

/**
 * `X-Robots-Tag: noindex` for addresses that must never be indexed.
 *
 *   - A Vercel preview deployment (VERCEL_ENV is fixed at build time):
 *     everything it serves is a copy of the site on another address.
 *   - Any `*.vercel.app` host of the production deployment, once the site
 *     has its own domain: Vercel serves production on both, and the
 *     `.vercel.app` copy is a duplicate of the real one. Only applied when
 *     NEXT_PUBLIC_SITE_URL names a domain that is not itself on vercel.app —
 *     otherwise this would de-index the only address the site has.
 *
 * The header complements robots.txt (which does the same for those hosts)
 * and every page's canonical tag, which already points at the real domain.
 */
type HeaderRule = Awaited<ReturnType<NonNullable<NextConfig["headers"]>>>[number];

function duplicateHostNoindexRules(): HeaderRule[] {
  const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
  const environment = process.env.VERCEL_ENV;

  if (environment === "preview" || environment === "development") {
    return [{ source: "/:path*", headers: noindex }];
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let siteHost = "";
  try {
    siteHost = siteUrl ? new URL(siteUrl).hostname : "";
  } catch {
    siteHost = "";
  }
  if (!siteHost || siteHost.endsWith(".vercel.app")) return [];

  return [
    {
      source: "/:path*",
      has: [{ type: "host", value: ".+\\.vercel\\.app" }],
      headers: noindex,
    },
  ];
}

/**
 * Exported as a function of the phase, not as a plain object.
 *
 * The phase is the only reliable way to tell `next start` from `next build`
 * and `next typegen`: all three run with NODE_ENV=production and none of
 * them sets NEXT_PHASE in the environment. The Codespace warning in
 * developmentServerActionOrigins is addressed to someone whose Server
 * Actions are about to be rejected, so it must reach a running server and
 * stay out of every build log.
 */
function buildNextConfig(phase: string): NextConfig {
  const allowedOrigins = developmentServerActionOrigins(phase);

  return {
    // No `X-Powered-By: Next.js`: it tells a scanner which framework (and so
    // which advisories) to try, and tells a customer nothing.
    poweredByHeader: false,

    htmlLimitedBots: SEO_CRAWLER_UA_RE,

    experimental: {
      serverActions: {
        bodySizeLimit: SERVER_ACTION_BODY_LIMIT,
        ...(allowedOrigins ? { allowedOrigins } : {}),
      },
    },

    images: {
      remotePatterns: supabaseImagePatterns(),
      // AVIF first, WebP as the fallback. Both are far smaller than the
      // JPEGs an operator uploads, which is the difference between a
      // gallery that loads on a mobile connection in Juba and one that
      // does not (brief §19).
      formats: ["image/avif", "image/webp"],
      // The default list ends at 3840px, which generates — and sends to any
      // 4K or high-DPI desktop — variants several times heavier than any
      // layout here can show: the widest image is a 62vw gallery, under
      // 2000px even at 2× density. Capping at 2048 removes that variant
      // without softening anything a screen can actually display.
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
      // 75 everywhere; 90 only where a photograph carries the brand (the
      // homepage hero). Next 16 serves only qualities listed here.
      qualities: [75, 90],
      // An optimised variant is re-encoded at most once a month instead of
      // every four hours. Safe because nothing served through the optimiser
      // changes under the same URL: every uploaded photograph and logo is
      // stored at a fresh UUID path (see src/lib/storage/*-media.ts). A
      // photograph under public/images that is *replaced* should be given a
      // new filename for the same reason.
      minimumCacheTTL: 2_678_400,
    },

    async headers() {
      return [
        {
          // Public pages: framed nowhere either. Nothing on this site is meant
          // to be embedded, and clickjacking a "REQUEST THIS VEHICLE" button
          // is as real a risk as clickjacking an admin action.
          source: "/:path*",
          headers: [...baseSecurityHeaders, ...framingHeaders],
        },
        ...duplicateHostNoindexRules(),
        {
          /**
           * The admin quotation PDF: "Open in a new tab", "Download", and the
           * preview dialog's fallback frame.
           *
           * The dialog draws the pages itself with PDF.js
           * (components/admin/pdf-preview.tsx), because no phone browser
           * renders a PDF in a frame. But PDF.js needs Safari 16.4 or later,
           * and on an older Mac the preview falls back to the browser's own
           * viewer in an `<iframe>` — so this one route may be framed by the
           * dashboard itself. Same origin only: it is still unframeable by any
           * other site, and it is a session-gated, read-only GET.
           *
           * The rest of the policy is dropped for the same reason as the
           * customer link below: a PDF runs no script this policy could
           * restrict, and Chrome's built-in viewer can refuse to display a
           * document whose own response carries `object-src 'none'`.
           */
          source: "/api/quotes/:id/preview",
          headers: [
            { key: "X-Frame-Options", value: "SAMEORIGIN" },
            { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          ],
        },
        {
          /**
           * The dashboard app's service worker (public/sw.js). Browsers must
           * always ask for the current copy, or a fix to it could sit behind
           * a cached old one; `updateViaCache: "none"` at registration says
           * the same from the other side.
           */
          source: "/sw.js",
          headers: [
            { key: "Cache-Control", value: "no-cache, max-age=0, must-revalidate" },
            { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          ],
        },
        {
          /**
           * The customer's quotation PDF link (rewritten to the API route).
           *
           * A PDF is not a page: it runs no script this policy could
           * restrict, and Chrome's built-in viewer can refuse to display a PDF
           * whose own response carries `object-src 'none'` — the customer
           * would get a blank tab instead of their quotation. So PDF
           * responses keep the framing directive alone, as before the full
           * policy existed. Both the public path and the route it rewrites to
           * are listed, because the header rules match either.
           */
          source: "/quotation/:token",
          headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }],
        },
        {
          source: "/api/quotations/:token",
          headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }],
        },
      ];
    },

    async rewrites() {
      return [
        /**
         * The customer's quotation link, exactly the shape the schema
         * documentation promises (`Quote.shareToken`): `/quotation/<token>`.
         * It resolves to the API route rather than living in `app/quotation`
         * directly because the PDF renderer needs the Node runtime, which a
         * page route in this project does not otherwise require.
         */
        {
          source: "/quotation/:token",
          destination: "/api/quotations/:token",
        },
        /**
         * Some crawlers and older browsers request /favicon.ico directly,
         * whatever the page declares. The generated app icon draws from the
         * uploaded favicon (or the brand monogram), so it is always the right
         * picture — and never a 404 in the logs.
         */
        {
          source: "/favicon.ico",
          destination: "/app-icon/favicon-48.png",
        },
      ];
    },
  };
}

/**
 * Sentry's build integration (error monitoring — see src/instrumentation.ts).
 *
 *   - Source maps are uploaded to Sentry so stack traces are readable, then
 *     deleted from the build output, so the site never serves them publicly.
 *     Without SENTRY_AUTH_TOKEN they are not generated at all: nothing is
 *     uploaded, and nothing is left behind to leak the source.
 *   - `/monitoring` relays browser error reports through this site, so
 *     ad-blockers do not drop them and the CSP needs no Sentry origin. The
 *     request proxy skips that path (src/proxy.ts).
 *   - With no DSN configured, the runtime SDK is disabled (sentry-options.ts);
 *     the build is unaffected either way.
 */
const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN?.trim());

export default function nextConfig(phase: string): NextConfig {
  return withSentryConfig(buildNextConfig(phase), {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    telemetry: false,
    tunnelRoute: "/monitoring",
    widenClientFileUpload: true,
    sourcemaps: {
      disable: !hasSentryAuthToken,
      deleteSourcemapsAfterUpload: true,
    },
    webpack: {
      treeshake: { removeDebugLogging: true },
    },
  });
}

