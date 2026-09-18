"use client"

import * as React from "react"

/** Horizontal travel, in px, before a touch counts as a swipe. */
const SWIPE_THRESHOLD_PX = 40

/**
 * Horizontal swipe detection for a photograph frame.
 *
 * Touch and pen only — a mouse already has the arrow buttons, and dragging
 * with a mouse is how people select text. The frame must carry
 * `touch-action: pan-y` (returned as `style`), which hands vertical movement
 * to the browser so the page still scrolls normally through the gallery, and
 * leaves horizontal movement to us.
 *
 * `consumeClick()` reports whether the last pointer-up ended a swipe, so a
 * frame that also opens on click does not open at the end of a swipe.
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  enabled?: boolean
}) {
  const start = React.useRef<{ x: number; y: number } | null>(null)
  const swiped = React.useRef(false)

  const handlers = {
    onPointerDown(event: React.PointerEvent) {
      // Cleared for every pointer, mouse included: a touch swipe produces no
      // click, so the flag must not survive to swallow the next real one.
      swiped.current = false
      if (!enabled || event.pointerType === "mouse") return
      start.current = { x: event.clientX, y: event.clientY }
    },
    onPointerUp(event: React.PointerEvent) {
      const from = start.current
      start.current = null
      if (!from) return

      const dx = event.clientX - from.x
      const dy = event.clientY - from.y

      // Clearly sideways, and far enough: a diagonal scroll is not a swipe.
      if (Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swiped.current = true
        if (dx < 0) onSwipeLeft()
        else onSwipeRight()
      }
    },
    onPointerCancel() {
      start.current = null
    },
  }

  const consumeClick = React.useCallback(() => {
    const was = swiped.current
    swiped.current = false
    return was
  }, [])

  return { handlers, style: { touchAction: "pan-y" } as React.CSSProperties, consumeClick }
}
