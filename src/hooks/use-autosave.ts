"use client"

import * as React from "react"

/**
 * Saves a value in the background as the operator edits it.
 *
 *   - A save starts once typing pauses (`delay`), or at once on `flush()` —
 *     wire that to the field's blur, so leaving a field never leaves it
 *     unsaved.
 *   - One save at a time. A value changed while a save is in flight is sent
 *     when it returns, so an older save can never land after a newer one and
 *     overwrite it.
 *   - A failed save is not retried in a loop: the status says so, the text
 *     stays in the field, and the next edit — or `retry()` — sends it again.
 *   - While anything is unsaved, closing the tab asks for confirmation.
 */

export type AutosaveResult =
  | { ok: true; savedAt: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }

export type AutosaveStatus =
  | { state: "saved"; savedAt: string | null }
  | { state: "pending" }
  | { state: "saving" }
  | { state: "error"; message: string; fieldErrors?: Record<string, string[]> }

export function useAutosave<T>({
  value,
  save,
  delay = 900,
  enabled = true,
}: {
  value: T
  save: (value: T) => Promise<AutosaveResult>
  delay?: number
  enabled?: boolean
}) {
  const key = JSON.stringify(value)

  const [savedKey, setSavedKey] = React.useState(key)
  const [saving, setSaving] = React.useState(false)
  const [savedAt, setSavedAt] = React.useState<string | null>(null)
  const [failure, setFailure] = React.useState<{ key: string; message: string; fieldErrors?: Record<string, string[]> } | null>(null)

  // Latest value and save function, read by the timer and by flush(). Synced
  // in an effect rather than during render.
  const valueRef = React.useRef(value)
  const saveRef = React.useRef(save)
  const savedKeyRef = React.useRef(savedKey)
  const inFlight = React.useRef(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    valueRef.current = value
    saveRef.current = save
  })

  const run = React.useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (inFlight.current) return

    inFlight.current = true
    setSaving(true)

    try {
      // Loops while the text moved on during the previous save, so the newest
      // text is always the last one sent.
      for (;;) {
        const snapshot = valueRef.current
        const snapshotKey = JSON.stringify(snapshot)
        if (snapshotKey === savedKeyRef.current) break

        let succeeded = false
        try {
          const result = await saveRef.current(snapshot)
          if (result.ok) {
            succeeded = true
            savedKeyRef.current = snapshotKey
            setSavedKey(snapshotKey)
            setSavedAt(result.savedAt)
            setFailure(null)
          } else {
            setFailure({ key: snapshotKey, message: result.message, fieldErrors: result.fieldErrors })
          }
        } catch {
          setFailure({
            key: snapshotKey,
            message: "Could not reach the server. Your text is kept here — it will save when you are back online.",
          })
        }

        if (!succeeded) break
      }
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }, [])

  // Debounce: every edit restarts the countdown.
  React.useEffect(() => {
    if (!enabled || key === savedKeyRef.current) return

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void run(), delay)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [key, enabled, delay, run])

  const dirty = key !== savedKey

  React.useEffect(() => {
    if (!dirty && !saving) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, saving])

  let status: AutosaveStatus
  if (saving) status = { state: "saving" }
  else if (failure && failure.key === key) status = { state: "error", message: failure.message, fieldErrors: failure.fieldErrors }
  else if (dirty) status = { state: "pending" }
  else status = { state: "saved", savedAt }

  return {
    status,
    /** Save now rather than after the pause — for a field's blur. */
    flush: () => {
      if (enabled) void run()
    },
    retry: () => void run(),
  }
}
