"use client"

import * as React from "react"
import { Bell, BellOff, CheckCircle2, Download, Loader2, MonitorSmartphone, Send, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { AppleInstallSteps } from "@/components/admin/pwa/install-instructions"
import { SettingsPanel } from "@/components/admin/settings/settings-ui"
import { Button } from "@/components/ui/button"
import { useAppEnvironment } from "@/hooks/use-app-environment"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { removePushDeviceAction } from "@/lib/actions/push.actions"
import {
  getInstallState,
  getServerInstallState,
  promptInstall,
  subscribeInstallState,
} from "@/lib/pwa/install-store"
import type { PushDevice } from "@/lib/queries/push.queries"
import { cn } from "@/lib/utils"

/**
 * Settings → Notifications: the parts that belong to *this device* rather
 * than to the business — installing the dashboard as an app, and switching
 * push notifications on here. Both are optional; nothing else in the
 * dashboard depends on either.
 */
export function DeviceAppSettings({
  publicKey,
  scope,
  devices,
}: {
  publicKey: string | null
  scope: string
  devices: PushDevice[]
}) {
  return (
    <>
      <InstallPanel />
      <PushPanel publicKey={publicKey} scope={scope} />
      {devices.length > 0 ? <DeviceList devices={devices} /> : null}
    </>
  )
}

/* ── Install ───────────────────────────────────────────────────────── */

const noopSubscribe = () => () => {}

function InstallPanel() {
  const { standalone, appleMobile, hydrated } = useAppEnvironment()
  const install = React.useSyncExternalStore(subscribeInstallState, getInstallState, getServerInstallState)
  // Chromium browsers — the ones with an install menu entry — expose this handler.
  const canInstallFromMenu = React.useSyncExternalStore(
    noopSubscribe,
    () => "onbeforeinstallprompt" in window,
    () => false
  )

  return (
    <SettingsPanel
      id="dashboard-app"
      title="Dashboard app"
      description="Install the dashboard on your phone or computer to open it from its own icon, full screen, like an app. It is optional: everything also works in the browser."
    >
      {!hydrated ? (
        <p className="text-small text-muted-foreground">Checking this device…</p>
      ) : standalone || install.installed ? (
        <StatusLine icon={CheckCircle2} tone="success">
          {standalone ? "You are using the installed app." : "Installed. Open it from its icon to use it as an app."}
        </StatusLine>
      ) : install.canPrompt ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-small text-muted-foreground">This browser can install the dashboard in one step.</p>
          <Button type="button" onClick={() => void promptInstall()}>
            <Download aria-hidden="true" className="size-4" />
            Install app
          </Button>
        </div>
      ) : appleMobile ? (
        <div className="flex flex-col gap-4">
          <p className="text-small text-muted-foreground">
            On iPhone and iPad the dashboard is installed from the browser&rsquo;s Share menu:
          </p>
          <AppleInstallSteps />
        </div>
      ) : canInstallFromMenu ? (
        // Chrome, Edge and Samsung Internet only offer the one-tap install
        // once they judge the site "engaged with"; their menu always has it.
        <p className="text-small text-muted-foreground">
          Open the browser menu (⋮ or ⋯) and choose <strong className="font-medium text-foreground">Install app</strong>{" "}
          or <strong className="font-medium text-foreground">Add to Home screen</strong>.
        </p>
      ) : (
        <p className="text-small text-muted-foreground">
          This browser does not offer installing web apps. Chrome and Edge on a computer or Android phone, and Safari on
          iPhone or iPad, do. On a Mac, Safari 17 or later can add it with File → Add to Dock.
        </p>
      )}
    </SettingsPanel>
  )
}

/* ── Push on this device ──────────────────────────────────────────── */

function PushPanel({ publicKey, scope }: { publicKey: string | null; scope: string }) {
  const push = usePushNotifications({ publicKey, scope })

  return (
    <SettingsPanel
      id="push-notifications"
      title="Notifications on this device"
      description="Alerts on this phone or computer, even when the dashboard is closed: new quote requests, and security alerts about your account (a sign-in from a new device, or sign-in blocked after wrong passwords). They show a reference number, never customer details."
    >
      <div aria-live="polite" className="flex flex-col gap-4">
        {push.state === "checking" ? (
          <p className="inline-flex items-center gap-2 text-small text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Checking this device…
          </p>
        ) : push.state === "on" ? (
          <>
            <StatusLine icon={Bell} tone="success">
              Notifications are on for this device.
            </StatusLine>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void push.sendTest()} disabled={push.busy}>
                <Send aria-hidden="true" className="size-4" />
                Send a test
              </Button>
              <Button type="button" variant="ghost" onClick={() => void push.disable()} disabled={push.busy}>
                <BellOff aria-hidden="true" className="size-4" />
                Turn off on this device
              </Button>
            </div>
          </>
        ) : push.state === "off" ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-small text-muted-foreground">
              Notifications are off here. Your browser will ask for permission when you turn them on.
            </p>
            <Button type="button" onClick={() => void push.enable()} disabled={push.busy}>
              {push.busy ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Bell aria-hidden="true" className="size-4" />
              )}
              Turn on notifications
            </Button>
          </div>
        ) : push.state === "needs-install" ? (
          <div className="flex flex-col gap-4">
            <p className="text-small text-muted-foreground">
              On iPhone and iPad, Apple only delivers notifications to web apps added to the Home Screen (iOS 16.4 or
              later). Install the dashboard first, open it from its icon, then come back to this page:
            </p>
            <AppleInstallSteps />
          </div>
        ) : push.state === "denied" ? (
          <p className="text-small text-muted-foreground">
            Notifications are blocked for this site in your browser settings. Allow them there — on a computer, click
            the icon beside the address bar; on a phone, open the browser&rsquo;s or app&rsquo;s notification
            settings — then reload this page.
          </p>
        ) : push.state === "not-configured" ? (
          <p className="text-small text-muted-foreground">
            Push notifications are not set up on the server yet. Email and in-dashboard alerts are unaffected.
          </p>
        ) : (
          <p className="text-small text-muted-foreground">
            This browser cannot receive notifications from the dashboard. Chrome, Edge, Firefox and Samsung Internet
            can, as can Safari on a Mac and the installed app on iPhone or iPad.
          </p>
        )}

        {push.message ? (
          <p
            role={push.message.tone === "error" ? "alert" : "status"}
            className={cn("text-small", push.message.tone === "error" ? "text-destructive" : "text-success")}
          >
            {push.message.text}
          </p>
        ) : null}
      </div>
    </SettingsPanel>
  )
}

/* ── Every device ─────────────────────────────────────────────────── */

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date)
}

function DeviceList({ devices }: { devices: PushDevice[] }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function remove(deviceId: string) {
    setError(null)
    startTransition(async () => {
      const result = await removePushDeviceAction({ deviceId })
      if (!result.ok) setError(result.message)
      router.refresh()
    })
  }

  return (
    <SettingsPanel
      id="push-devices"
      title="Your devices with notifications"
      description="Every phone and computer you have switched notifications on for. Signing out on a device, or changing your password, removes it automatically."
    >
      <ul className="flex flex-col divide-y divide-border">
        {devices.map((device) => (
          <li key={device.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 items-center gap-3">
              <MonitorSmartphone aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-small font-medium">{device.deviceLabel ?? "Unknown device"}</span>
                <span className="text-xs text-muted-foreground">
                  Added {formatDate(device.createdAt)}
                  {device.lastSuccessAt ? ` · last notified ${formatDate(device.lastSuccessAt)}` : ""}
                </span>
              </div>
            </div>
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  aria-label={`Stop notifications on ${device.deviceLabel ?? "this device"}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              }
              title="Stop notifications on this device?"
              description={`${device.deviceLabel ?? "This device"} will no longer receive dashboard notifications. It can be switched on again from the device itself.`}
              confirmLabel="Stop notifications"
              destructive
              onConfirm={() => remove(device.id)}
            />
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}
    </SettingsPanel>
  )
}

function StatusLine({
  icon: Icon,
  tone,
  children,
}: {
  icon: typeof Bell
  tone: "success"
  children: React.ReactNode
}) {
  return (
    <p className={cn("inline-flex items-center gap-2 text-small font-medium", tone === "success" && "text-foreground")}>
      <Icon aria-hidden="true" className="size-4 text-success" />
      {children}
    </p>
  )
}
