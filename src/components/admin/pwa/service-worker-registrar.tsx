"use client"

import * as React from "react"

import { captureInstallPrompt } from "@/lib/pwa/install-store"

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000

/**
 * Registers the dashboard's service worker (public/sw.js), scoped to the
 * dashboard alone, and starts listening for the browser's install offer.
 *
 * Mounted by the root admin layout, so it runs on the sign-in page too: an
 * administrator can install the app before signing in, and the install offer
 * — which browsers fire once, early — is not missed.
 *
 * Production only. In development the worker would keep serving build assets
 * that the dev server replaces on every edit, so any left over from a
 * production run on the same address is removed instead.
 *
 * An installed app can stay open for days, so it looks for a new worker when
 * it comes back to the foreground (at most every 30 minutes).
 */
export function ServiceWorkerRegistrar({ scope }: { scope: string }) {
  React.useEffect(() => {
    captureInstallPrompt()

    if (!("serviceWorker" in navigator)) return

    const scopeUrl = new URL(scope, window.location.origin).href

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistration(scopeUrl)
        .then((registration) => registration?.unregister())
        .catch((error: unknown) => console.error("[pwa] could not remove a development service worker", error))
      return
    }

    let registration: ServiceWorkerRegistration | null = null
    let lastCheck = Date.now()

    navigator.serviceWorker
      .register("/sw.js", { scope, updateViaCache: "none" })
      .then((registered) => {
        registration = registered
      })
      .catch((error: unknown) => {
        // The dashboard works fully without it; only install and push need it.
        console.error("[pwa] service worker registration failed", error)
      })

    const checkForUpdate = () => {
      if (document.visibilityState !== "visible" || !registration) return
      if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) return
      lastCheck = Date.now()
      registration.update().catch(() => {
        // Offline or the server is busy: the next foregrounding tries again.
      })
    }

    document.addEventListener("visibilitychange", checkForUpdate)
    return () => document.removeEventListener("visibilitychange", checkForUpdate)
  }, [scope])

  return null
}
