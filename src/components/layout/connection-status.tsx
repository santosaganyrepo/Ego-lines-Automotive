"use client"

import * as React from "react"
import { WifiOff } from "lucide-react"

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

/**
 * Says so when the connection drops, instead of letting the next tap fail
 * silently — mobile data across the region comes and goes. Server-rendered as
 * online (`getServerSnapshot`), so nothing is shown until the browser itself
 * reports being offline.
 */
export function ConnectionStatus() {
  const online = React.useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
      {online ? null : (
        <p className="pointer-events-auto flex items-center gap-3 rounded-lg bg-night px-4 py-3 text-small text-white shadow-[var(--shadow-raised)] ring-1 ring-white/10">
          <WifiOff aria-hidden="true" className="size-4 shrink-0 text-gold" />
          You are offline. Pages will load again once your connection is back.
        </p>
      )}
    </div>
  )
}
