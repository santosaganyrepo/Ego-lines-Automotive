"use client"

import * as React from "react"

/**
 * Which photographs of a crossfading gallery to put in the DOM.
 *
 * The galleries stack every frame in one box and fade between them, so a
 * mounted frame is always "in the viewport" as far as the browser is
 * concerned — `loading="lazy"` cannot defer it, and a phone opening a
 * twelve-photo listing used to download all twelve full-size photographs
 * before the visitor had looked past the first.
 *
 * So a frame is mounted only when it is needed:
 *
 *   - the first photograph, always (it is the page's LCP image);
 *   - any photograph the visitor has already reached, so fading back to it
 *     never reloads it;
 *   - once the visitor shows interest — a pointer or finger on the gallery,
 *     keyboard focus inside it, or a move to another photograph — the
 *     neighbours of the one on screen, so the next swipe or arrow press
 *     fades into an image that is already decoded rather than a blank frame.
 *
 * Someone who never touches the gallery downloads one photograph.
 *
 * `engage` goes on the gallery's container (`onPointerEnter`, `onFocus`).
 */
export function useGalleryFrames(count: number, active: number) {
  const [reached, setReached] = React.useState<ReadonlySet<number>>(() => new Set([0]))
  const [engaged, setEngaged] = React.useState(false)

  // Recorded during render rather than in an effect, so a newly reached frame
  // is mounted in the same render that makes it active (React's pattern for
  // state derived from a changing prop).
  if (!reached.has(active)) {
    setReached((previous) => new Set(previous).add(active))
  }

  const interested = engaged || reached.size > 1

  function isMounted(index: number): boolean {
    if (reached.has(index) || index === active) return true
    if (!interested || count < 2) return false

    return index === (active + 1) % count || index === (active - 1 + count) % count
  }

  const engage = React.useCallback(() => setEngaged(true), [])

  return { isMounted, engage }
}
