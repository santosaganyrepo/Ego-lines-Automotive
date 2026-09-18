"use client"

import * as React from "react"
import Image from "next/image"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { ChevronLeft, ChevronRight, XIcon, ZoomIn, ZoomOut } from "lucide-react"

import { useSwipe } from "@/hooks/use-swipe"
import { cn } from "@/lib/utils"

const ZOOM_SCALE = 2.5

export interface LightboxPhoto {
  id: string
  url: string
  alt: string
}

/**
 * Full-screen photograph viewer, opened from a gallery.
 *
 * Built on the Base UI dialog, which supplies what a modal must: focus moves
 * into it and is trapped there, Escape closes it, and focus returns to the
 * photograph that opened it. On top of that:
 *
 *   - arrow keys, the on-screen arrows and a horizontal swipe move between
 *     photographs;
 *   - double-tap / double-click (or the zoom button) zooms towards the point
 *     touched, and dragging then pans around the enlarged photograph.
 *
 * The photograph is `object-contain` at full viewport width, so nothing is
 * cropped — the gallery crops for layout, the lightbox is where a buyer sees
 * the whole frame.
 */
export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  open,
  onOpenChange,
  title,
}: {
  photos: readonly LightboxPhoto[]
  index: number
  onIndexChange: (index: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Names the dialog for assistive technology, e.g. "Toyota Harrier 2021 photographs". */
  title: string
}) {
  const [zoomed, setZoomed] = React.useState(false)
  const [origin, setOrigin] = React.useState({ x: 50, y: 50 })
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const drag = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const [dragging, setDragging] = React.useState(false)

  const count = photos.length
  const photo = photos[index]

  const resetZoom = React.useCallback(() => {
    setZoomed(false)
    setPan({ x: 0, y: 0 })
  }, [])

  const go = React.useCallback(
    (delta: -1 | 1) => {
      resetZoom()
      onIndexChange((index + delta + count) % count)
    },
    [count, index, onIndexChange, resetZoom]
  )

  const swipe = useSwipe({ onSwipeLeft: () => go(1), onSwipeRight: () => go(-1), enabled: !zoomed && count > 1 })

  function toggleZoomAt(clientX: number, clientY: number, frame: HTMLElement) {
    if (zoomed) {
      resetZoom()
      return
    }
    const rect = frame.getBoundingClientRect()
    setOrigin({
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    })
    setZoomed(true)
  }

  if (!photo) return null

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) resetZoom()
        onOpenChange(next)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-night/95 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className="fixed inset-0 z-50 flex flex-col text-white outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onKeyDown={(event) => {
            if (count > 1 && event.key === "ArrowRight") go(1)
            if (count > 1 && event.key === "ArrowLeft") go(-1)
          }}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>

          {/* Top bar: position, zoom, close. Clear of a notch or status bar. */}
          <div className="flex items-center justify-between gap-4 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
            <span className="tabular text-small text-white/80" aria-live="polite">
              {`${index + 1} / ${count}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (zoomed ? resetZoom() : setZoomed(true))}
                aria-label={zoomed ? "Zoom out" : "Zoom in"}
                aria-pressed={zoomed}
                className="grid size-11 place-items-center rounded-lg bg-white/10 transition-colors duration-fast hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {zoomed ? <ZoomOut aria-hidden="true" className="size-5" /> : <ZoomIn aria-hidden="true" className="size-5" />}
              </button>
              <DialogPrimitive.Close
                aria-label="Close photographs"
                className="grid size-11 place-items-center rounded-lg bg-white/10 transition-colors duration-fast hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <XIcon aria-hidden="true" className="size-5" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* The photograph. */}
          <div
            className={cn("relative min-h-0 flex-1 overflow-hidden", zoomed ? "cursor-grab" : "cursor-zoom-in")}
            style={zoomed ? { touchAction: "none" } : swipe.style}
            onDoubleClick={(event) => toggleZoomAt(event.clientX, event.clientY, event.currentTarget)}
            {...(zoomed
              ? {
                  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
                    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
                    setDragging(true)
                    event.currentTarget.setPointerCapture(event.pointerId)
                  },
                  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
                    if (!drag.current) return
                    setPan({
                      x: drag.current.panX + (event.clientX - drag.current.x),
                      y: drag.current.panY + (event.clientY - drag.current.y),
                    })
                  },
                  onPointerUp: () => {
                    drag.current = null
                    setDragging(false)
                  },
                }
              : swipe.handlers)}
          >
            <div
              className="absolute inset-0 transition-transform duration-base ease-crownline"
              style={{
                transform: zoomed ? `translate(${pan.x}px, ${pan.y}px) scale(${ZOOM_SCALE})` : undefined,
                transformOrigin: `${origin.x}% ${origin.y}%`,
                transitionDuration: dragging ? "0ms" : undefined,
              }}
            >
              <Image
                key={photo.id}
                src={photo.url}
                alt={photo.alt}
                fill
                quality={90}
                sizes="100vw"
                className="object-contain select-none"
                draggable={false}
              />
            </div>

            {count > 1 && !zoomed ? (
              <>
                <LightboxArrow direction="previous" onClick={() => go(-1)} />
                <LightboxArrow direction="next" onClick={() => go(1)} />
              </>
            ) : null}
          </div>

          <p className="px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] text-center text-small text-white/60">
            {zoomed ? "Drag to look around · double-tap to zoom out" : "Double-tap to zoom · swipe for more"}
          </p>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function LightboxArrow({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "previous" ? "Previous photograph" : "Next photograph"}
      className={cn(
        "absolute top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur-sm",
        "transition-colors duration-fast hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-ring",
        direction === "previous" ? "left-3" : "right-3"
      )}
    >
      <Icon aria-hidden="true" className="size-6" />
    </button>
  )
}
