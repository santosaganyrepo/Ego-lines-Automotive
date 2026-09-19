"use client"

import * as React from "react"
import { Download, X } from "lucide-react"

import { AppleInstallSteps } from "@/components/admin/pwa/install-instructions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAppEnvironment } from "@/hooks/use-app-environment"
import {
  getInstallState,
  getServerInstallState,
  promptInstall,
  subscribeInstallState,
} from "@/lib/pwa/install-store"

/**
 * The small "Install app" button in the dashboard's top bar.
 *
 * Only shown when installing is actually possible here and has not happened:
 * where the browser offers installation (Chrome, Edge, Samsung Internet and
 * other Chromium browsers), or on an iPhone/iPad not yet running the app,
 * where it explains the Share → Add to Home Screen steps. Nowhere else — no
 * button that leads nowhere.
 *
 * It can be hidden for 30 days on this device; Settings → Notifications
 * always keeps the install option.
 */

const DISMISS_KEY = "crownline.admin.install-dismissed-at"
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000
const dismissListeners = new Set<() => void>()

function readDismissed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_MS
  } catch {
    // Storage blocked (private mode): the button simply shows.
    return false
  }
}

function subscribeDismissed(listener: () => void) {
  dismissListeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    dismissListeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function dismiss() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch (error) {
    console.error("[pwa] could not remember the dismissal", error)
  }
  for (const listener of dismissListeners) listener()
}

export function AppInstallButton() {
  const { standalone, appleMobile, hydrated } = useAppEnvironment()
  const install = React.useSyncExternalStore(subscribeInstallState, getInstallState, getServerInstallState)
  const dismissed = React.useSyncExternalStore(subscribeDismissed, readDismissed, () => true)

  if (!hydrated || standalone || install.installed || dismissed) return null
  if (!install.canPrompt && !appleMobile) return null

  const label = (
    <>
      <Download aria-hidden="true" className="size-3.5" />
      <span className="max-sm:sr-only">Install app</span>
    </>
  )
  const buttonClass =
    "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-gold-ink/40 bg-gold/10 px-3 text-small font-medium text-foreground transition-colors duration-fast hover:bg-gold/20 max-sm:w-9 max-sm:justify-center max-sm:px-0 pointer-coarse:h-11 pointer-coarse:max-sm:w-11"

  return (
    <div className="flex shrink-0 items-center">
      {install.canPrompt ? (
        <button type="button" className={buttonClass} onClick={() => void promptInstall()}>
          {label}
        </button>
      ) : (
        <Dialog>
          <DialogTrigger render={<button type="button" className={buttonClass} />}>{label}</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Install the dashboard</DialogTitle>
              <DialogDescription>
                Add it to your Home Screen to open it like an app — and to receive notifications on this iPhone or iPad
                (iOS 16.4 or later).
              </DialogDescription>
            </DialogHeader>
            <AppleInstallSteps />
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Done</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide the install suggestion"
        title="Hide for 30 days"
        className="-ml-1 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast hover:text-foreground pointer-coarse:size-11"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  )
}
