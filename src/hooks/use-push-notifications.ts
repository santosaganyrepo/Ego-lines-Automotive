"use client"

import * as React from "react"

import { useAppEnvironment } from "@/hooks/use-app-environment"
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
  syncPushSubscriptionAction,
} from "@/lib/actions/push.actions"
import { base64UrlToBytes, subscriptionMatchesKey } from "@/lib/pwa/pwa-environment"

/**
 * Push notifications for this device, as a small state machine the settings
 * panel renders from.
 *
 *   checking        — reading the browser's current state
 *   unsupported     — this browser cannot receive Web Push, or the service
 *                     worker is not running (always the case in development)
 *   needs-install   — iPhone/iPad in a browser tab: Apple only delivers push
 *                     to a web app added to the Home Screen (iOS 16.4+)
 *   not-configured  — the server has no push keys
 *   denied          — the person blocked notifications for this site
 *   off / on        — ready to switch on / switched on and registered
 *
 * The permission prompt is only ever shown from a tap on "Turn on" — never
 * on page load — and iOS requires exactly that.
 */

export type PushState = "checking" | "unsupported" | "needs-install" | "not-configured" | "denied" | "off" | "on"

const READY_TIMEOUT_MS = 8_000

async function dashboardRegistration(scope: string): Promise<ServiceWorkerRegistration | null> {
  const scopeUrl = new URL(scope, window.location.origin).href
  const registration = await navigator.serviceWorker.getRegistration(scopeUrl)
  if (!registration) return null
  if (registration.active) return registration

  // Just registered: wait for it to activate, but not forever.
  return Promise.race([
    navigator.serviceWorker.ready.then((ready) => (ready.scope === registration.scope ? ready : null)),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), READY_TIMEOUT_MS)),
  ])
}

function browserSupportsPush(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

export function usePushNotifications({ publicKey, scope }: { publicKey: string | null; scope: string }) {
  const { standalone, appleMobile, hydrated } = useAppEnvironment()
  const [state, setState] = React.useState<PushState>("checking")
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState<{ tone: "success" | "error"; text: string } | null>(null)
  const endpointRef = React.useRef<string | null>(null)

  const detect = React.useCallback(async (): Promise<PushState> => {
    if (!browserSupportsPush()) return appleMobile && !standalone ? "needs-install" : "unsupported"
    if (appleMobile && !standalone) return "needs-install"
    if (!publicKey) return "not-configured"
    if (Notification.permission === "denied") return "denied"

    const registration = await dashboardRegistration(scope)
    if (!registration) return "unsupported"

    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return "off"

    // Made with keys this server no longer holds: it can never receive
    // anything, so it is cleared rather than reported as "on".
    if (!subscriptionMatchesKey(subscription.options.applicationServerKey, publicKey)) {
      await subscription.unsubscribe().catch(() => {})
      return "off"
    }

    endpointRef.current = subscription.endpoint
    if (Notification.permission !== "granted") return "off"

    const { registered } = await syncPushSubscriptionAction({ endpoint: subscription.endpoint })
    return registered ? "on" : "off"
  }, [appleMobile, standalone, publicKey, scope])

  React.useEffect(() => {
    if (!hydrated) return
    let cancelled = false

    detect()
      .then((next) => {
        if (!cancelled) setState(next)
      })
      .catch((error: unknown) => {
        console.error("[push] could not read this device's notification state", error)
        if (!cancelled) setState("unsupported")
      })

    return () => {
      cancelled = true
    }
  }, [detect, hydrated])

  /** Must be called straight from a tap: the permission prompt needs the gesture. */
  async function enable() {
    if (!publicKey) return
    setMessage(null)

    // Before any other await — Safari only shows the prompt inside the gesture.
    let permission: NotificationPermission
    try {
      permission = await Notification.requestPermission()
    } catch (error) {
      console.error("[push] the permission request failed", error)
      setMessage({ tone: "error", text: "Your browser did not show the permission request. Try again." })
      return
    }

    if (permission === "denied") {
      setState("denied")
      return
    }
    if (permission !== "granted") {
      setMessage({ tone: "error", text: "Notifications were not allowed. Tap “Turn on” again when you are ready." })
      return
    }

    setBusy(true)
    try {
      const registration = await dashboardRegistration(scope)
      if (!registration) {
        setState("unsupported")
        return
      }

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToBytes(publicKey),
        }))

      const json = subscription.toJSON()
      const result = await savePushSubscriptionAction({ endpoint: json.endpoint, keys: json.keys })

      if (!result.ok) {
        // Not registered on the server, so not left half-on in the browser.
        await subscription.unsubscribe().catch(() => {})
        setMessage({ tone: "error", text: result.message })
        setState("off")
        return
      }

      endpointRef.current = subscription.endpoint
      setState("on")
      setMessage({ tone: "success", text: result.message ?? "Notifications are on for this device." })
    } catch (error) {
      console.error("[push] could not subscribe", error)
      setMessage({
        tone: "error",
        text: "This browser could not set up notifications. Check that it is up to date, then try again.",
      })
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setMessage(null)
    setBusy(true)
    try {
      const registration = await dashboardRegistration(scope)
      const subscription = await registration?.pushManager.getSubscription()
      const endpoint = subscription?.endpoint ?? endpointRef.current

      if (endpoint) {
        const result = await removePushSubscriptionAction({ endpoint })
        if (!result.ok) {
          setMessage({ tone: "error", text: result.message })
          return
        }
      }
      await subscription?.unsubscribe().catch(() => {})
      endpointRef.current = null
      setState("off")
      setMessage({ tone: "success", text: "Notifications are off for this device." })
    } catch (error) {
      console.error("[push] could not unsubscribe", error)
      setMessage({ tone: "error", text: "Could not turn notifications off. Please try again." })
    } finally {
      setBusy(false)
    }
  }

  async function sendTest() {
    const endpoint = endpointRef.current
    if (!endpoint) return
    setMessage(null)
    setBusy(true)
    try {
      const result = await sendTestPushAction({ endpoint })
      setMessage({ tone: result.ok ? "success" : "error", text: result.message ?? "Test sent." })
    } catch (error) {
      console.error("[push] could not send a test", error)
      setMessage({ tone: "error", text: "Could not reach the server. Check your connection and try again." })
    } finally {
      setBusy(false)
    }
  }

  return { state, busy, message, enable, disable, sendTest }
}
