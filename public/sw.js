/*
 * Service worker for the installable admin dashboard.
 *
 * Registered only by dashboard pages (src/components/admin/pwa/pwa-provider.tsx)
 * with the dashboard's own path as its scope, so it never touches the public
 * website. It deliberately contains no dashboard path of its own: everything
 * it needs is read from `self.registration.scope`.
 *
 * ── What it caches, and what it never caches ─────────────────────────────
 * The dashboard shows customers' names, phone numbers, orders and payments.
 * None of that is ever written to the cache: pages, data requests and server
 * actions always go to the network. Only build assets with content hashes in
 * their names (/_next/static/…) and the app icons are cached — they are
 * identical for every visitor and change name whenever they change — so the
 * app opens fast without any customer data sitting on the device.
 *
 * Offline, a page request answers with a small self-contained "You are
 * offline" screen instead of the browser's error page.
 *
 * ── Updates ──────────────────────────────────────────────────────────────
 * A new version activates at once (skipWaiting + clients.claim). That is safe
 * precisely because no page is cached: the next navigation fetches the new
 * HTML, which asks for the new hashed assets. Bump CACHE_VERSION only when
 * the caching rules themselves change; old caches are deleted on activation.
 *
 * ── Push ─────────────────────────────────────────────────────────────────
 * Every push is shown (iOS withdraws permission from a site that receives a
 * push without showing a notification), even one that cannot be read. A
 * notification only ever opens a page inside this worker's scope.
 */

const CACHE_VERSION = "v1"
const STATIC_CACHE = `admin-static-${CACHE_VERSION}`
const STATIC_CACHE_MAX_ENTRIES = 250

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((name) => name.startsWith("admin-") && name !== STATIC_CACHE).map((name) => caches.delete(name))
      )
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable()
      }
      await self.clients.claim()
    })()
  )
})

/* ── Fetch ────────────────────────────────────────────────────────────── */

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/app-icon/")
}

async function trimCache(cache) {
  const keys = await cache.keys()
  const excess = keys.length - STATIC_CACHE_MAX_ENTRIES
  for (let index = 0; index < excess; index += 1) {
    await cache.delete(keys[index])
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  // Only complete, successful, same-origin answers are worth keeping.
  if (response.ok && response.status === 200 && response.type === "basic") {
    await cache.put(request, response.clone())
    trimCache(cache).catch(() => {})
  }
  return response
}

function offlinePage() {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0f0f0f"><title>Offline</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f0f0f;color:#f5f3ee;
font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px;padding-top:max(24px,env(safe-area-inset-top))}
main{max-width:26rem;text-align:center}
h1{font-size:24px;line-height:1.3;margin:0 0 12px}
p{margin:0 0 28px;color:#b9b5ad}
button{min-height:44px;padding:0 24px;border:0;border-radius:8px;background:#d9b04c;color:#141414;font:600 15px/1 inherit;cursor:pointer}
button:focus-visible{outline:2px solid #f5f3ee;outline-offset:3px}
</style></head>
<body><main>
<h1>You're offline</h1>
<p>The dashboard needs a connection to show current orders, quotes and payments. Check your connection and try again.</p>
<button type="button" onclick="location.reload()">Try again</button>
</main></body></html>`
  return new Response(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  })
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse
          if (preloaded) return preloaded
          return await fetch(request)
        } catch {
          return offlinePage()
        }
      })()
    )
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request))
  }
  // Everything else — data, server actions, uploads, other sites — is left
  // to the browser, untouched and uncached.
})

/* ── Push ─────────────────────────────────────────────────────────────── */

function scopePath() {
  return new URL(self.registration.scope).pathname.replace(/\/$/, "")
}

/** A payload path, joined to the dashboard scope — or the dashboard home for anything unexpected. */
function targetUrl(path) {
  const base = scopePath()
  const safe =
    typeof path === "string" &&
    /^\/[A-Za-z0-9\-._~/?=&%]*$/.test(path) &&
    !path.startsWith("//") &&
    !/(^|\/)\.\.?(\/|$|\?)/.test(path)
  const url = new URL(base + (safe && path !== "/" ? path : ""), self.location.origin)
  return url.origin === self.location.origin && url.pathname.startsWith(base) ? url.href : new URL(base, self.location.origin).href
}

self.addEventListener("push", (event) => {
  let payload = null
  try {
    payload = event.data ? event.data.json() : null
  } catch {
    payload = null
  }

  const title = payload && typeof payload.title === "string" && payload.title ? payload.title : "Dashboard update"
  const options = {
    body: payload && typeof payload.body === "string" ? payload.body : "Open the dashboard to see what's new.",
    icon: "/app-icon/icon-192.png",
    badge: "/app-icon/badge-96.png",
    tag: payload && typeof payload.tag === "string" ? payload.tag : "admin",
    renotify: true,
    requireInteraction: Boolean(payload && payload.requireInteraction),
    timestamp: Date.now(),
    data: { url: targetUrl(payload ? payload.path : "/") },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || targetUrl("/")

  event.waitUntil(
    (async () => {
      const base = new URL(self.registration.scope).href.replace(/\/$/, "")
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })

      // Reuse an open dashboard window rather than stacking new ones.
      for (const client of windows) {
        if (client.url.startsWith(base) && "focus" in client) {
          await client.focus()
          if ("navigate" in client && client.url !== url) {
            try {
              await client.navigate(url)
            } catch {
              // An uncontrolled window cannot be navigated by the worker;
              // opening a new one below still gets the admin there.
              await self.clients.openWindow(url)
            }
          }
          return
        }
      }

      await self.clients.openWindow(url)
    })()
  )
})

/* ── Subscription renewal ────────────────────────────────────────────── */

// Some browsers replace a push subscription on their own. The new one is
// registered against the old, whose unguessable endpoint proves this device
// held it (see src/app/api/push/renew/route.ts). Without an old subscription
// there is nothing to prove, and the dashboard re-registers on its next open.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const old = event.oldSubscription
      if (!old) return

      const replacement =
        event.newSubscription ||
        (await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: old.options.applicationServerKey,
        }))

      await fetch("/api/push/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ oldEndpoint: old.endpoint, subscription: replacement.toJSON() }),
      })
    })().catch(() => {})
  )
})
