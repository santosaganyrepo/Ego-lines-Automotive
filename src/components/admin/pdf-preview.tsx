"use client"

import * as React from "react"
import * as Sentry from "@sentry/nextjs"
import { AlertTriangle, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * An on-screen preview of a PDF this application generated, drawn page by
 * page onto canvases.
 *
 * ── Why not an `<iframe>` ────────────────────────────────────────────────
 * That is what this replaced, and it is exactly why an operator could not
 * review a quotation on their phone. Embedding a PDF depends entirely on
 * the browser having a built-in viewer *and* being willing to run it inside
 * a frame: desktop Chrome, Edge, Firefox and Safari do; Chrome on Android
 * does not (it offers a download instead), and Safari on iPhone renders at
 * most a cropped, unscrollable first page. The frame is not broken there —
 * there is simply nothing to render into it, which is why "download it
 * first, then look at it" was the only way through.
 *
 * Drawing the pages ourselves removes that dependency: the same pixels
 * appear on every device, because the same engine (PDF.js — the one Firefox
 * ships and Chrome's viewer is descended from) produces them.
 *
 * ── Why the engine runs on the main thread ───────────────────────────────
 * PDF.js normally starts a Web Worker from a separate script file, and
 * locating that file is a bundler-specific problem with a different answer
 * in webpack, Turbopack and every future one — a build-time footgun that
 * shows up only in production, as a viewer that never loads. Assigning the
 * worker module to `globalThis.pdfjsWorker` is PDF.js's own supported way to
 * say "you already have it": it then talks to the engine over an in-process
 * loopback port instead of a worker, and no URL is ever resolved. These
 * documents are a page or two of text, so the render costs milliseconds, and
 * both modules are behind a dynamic import — nothing here is downloaded
 * until an operator actually opens a preview.
 *
 * ── Fidelity ─────────────────────────────────────────────────────────────
 * Pages are drawn at the container's width times the device pixel ratio
 * (capped, so a 3× phone screen does not allocate a canvas nobody can see),
 * and redrawn when that width changes. The document is the real file — the
 * same bytes the customer is sent and the "Download" action saves.
 *
 * ── When PDF.js cannot run ────────────────────────────────────────────────
 * Even the legacy build needs a browser from 2023 onwards: it is written with
 * class static blocks and draws through `OffscreenCanvas`, both of which
 * Safari gained only in 16.4. A Mac that has not been updated past macOS
 * Monterey's first Safari fails to load the engine at all — which is the
 * "works on my phone, fails on the Mac" report. Every *desktop* browser,
 * old or new, has its own PDF viewer that renders inline, so there the
 * preview falls back to showing the document in a frame (the route allows
 * same-origin framing for exactly this — see next.config.ts). Phones have no
 * such viewer, and keep the message pointing at "Open" and "Download".
 * Either way the failure is reported to Sentry, with the browser version, so
 * the next one is diagnosable rather than anecdotal.
 */

/** Above this, extra pixels cost memory and buy nothing visible. */
const MAX_PIXEL_RATIO = 2
/** A guard against a malformed or malicious document; quotations are short. */
const MAX_PAGES = 20
/** Ignore sub-pixel container changes; only a real resize is worth redrawing. */
const RESIZE_EPSILON_PX = 8

type PdfModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs")

let enginePromise: Promise<PdfModule> | null = null

/**
 * `Promise.withResolvers` (ES2024) for browsers that predate it — Safari
 * before 17.4, Chrome before 119. PDF.js calls it unguarded, and it is the
 * one modern built-in its legacy build does not polyfill. A spec-conforming
 * definition, installed only where the browser has none.
 */
function ensurePromiseWithResolvers(): void {
  if (typeof Promise.withResolvers === "function") return
  Object.defineProperty(Promise, "withResolvers", {
    configurable: true,
    writable: true,
    value: function withResolvers<T>(this: PromiseConstructor) {
      let resolve!: (value: T | PromiseLike<T>) => void
      let reject!: (reason?: unknown) => void
      const promise = new this<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    },
  })
}

/**
 * Loads PDF.js once per page load, with its engine wired to run in-process.
 * Concurrent callers share the same promise; a failed load is not cached, so
 * a preview opened again after a dropped connection tries afresh.
 *
 * ── Why the legacy build ──────────────────────────────────────────────────
 * PDF.js's default ("modern") build targets only the newest browser releases
 * and calls brand-new built-ins without a fallback — `Map.prototype.
 * getOrInsertComputed`, `Math.sumPrecise`, `Promise.try`. A phone on the
 * latest OS has them; a Mac whose Safari or Chrome is a version or two
 * behind does not, and the preview failed there with "could not be drawn".
 * The legacy build is the same engine with those built-ins polyfilled,
 * published by PDF.js for exactly this, so it renders identically on every
 * browser the dashboard supports. It is ~20% larger, and only downloaded
 * when a preview is opened.
 */
async function loadEngine(): Promise<PdfModule> {
  enginePromise ??= (async () => {
    ensurePromiseWithResolvers()
    const [pdfjs, worker] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
    ])
    // PDF.js checks for this before it tries to start a Web Worker.
    ;(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker
    return pdfjs
  })().catch((error: unknown) => {
    enginePromise = null
    throw error
  })

  return enginePromise
}

interface PdfPreviewProps {
  /** Same-origin URL of the document. Sent with the session cookie. */
  src: string
  /** Names the document for assistive technology, e.g. "Quotation CLM-Q-2026-000045". */
  label: string
  className?: string
}

type Status =
  | { kind: "loading" }
  | { kind: "ready"; pages: number }
  | { kind: "native" }
  | { kind: "error"; message: string }

/**
 * Whether this browser shows a PDF inline in a frame with its own viewer.
 *
 * `navigator.pdfViewerEnabled` answers it directly where it exists (Chrome
 * 94+, Firefox 99+, Safari 16.4+). Older desktop browsers predate the
 * property but all ship a viewer; phones and tablets do not render a framed
 * PDF usefully even when they claim one. iPadOS reports a Mac user agent, so
 * touch points tell the two apart.
 */
function canShowPdfInline(): boolean {
  if (typeof navigator === "undefined") return false
  const touchDevice = navigator.maxTouchPoints > 1 || /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent)
  if (touchDevice) return false
  return navigator.pdfViewerEnabled !== false
}

export function PdfPreview({ src, label, className }: PdfPreviewProps) {
  const canvasHostRef = React.useRef<HTMLDivElement>(null)
  const [status, setStatus] = React.useState<Status>({ kind: "loading" })
  const [width, setWidth] = React.useState(0)

  // The rendered width drives the canvas resolution, so it is state rather
  // than a ref: a change has to re-run the render effect below.
  //
  // Measured on the canvas host, not on the scroll container: the container
  // carries padding, so its `clientWidth` and the observer's `contentRect`
  // would disagree by that much and the first observation would redraw every
  // page for nothing. The host has no padding, so both are the same number.
  React.useEffect(() => {
    const element = canvasHostRef.current
    if (!element) return

    const apply = (next: number) => {
      setWidth((current) => (Math.abs(current - next) < RESIZE_EPSILON_PX ? current : next))
    }

    apply(element.clientWidth)
    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) apply(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (width <= 0) return

    let cancelled = false
    // Held so the document is released even if the dialog closes mid-render.
    let task: { destroy: () => Promise<void> } | null = null

    // Deferred rather than called from the effect body: a synchronous
    // setState here runs during commit and forces an immediate cascading
    // re-render (the same deferral, for the same reason, as
    // useHeroBehindHeader in site-header.tsx). It only matters on a re-render
    // at a new width — the first render is already "loading".
    queueMicrotask(() => {
      if (!cancelled) setStatus((current) => (current.kind === "ready" ? current : { kind: "loading" }))
    })

    void (async () => {
      try {
        const pdfjs = await loadEngine()
        if (cancelled) return

        const loadingTask = pdfjs.getDocument({
          url: src,
          // Errors only. At the default level PDF.js announces "Setting up
          // fake worker" on every open — accurate and expected here (see
          // `loadEngine`), and nothing an operator or a developer reading the
          // console should have to scroll past. Real failures still surface:
          // they reject the render and are reported below.
          verbosity: pdfjs.VerbosityLevel.ERRORS,
        })
        task = loadingTask

        const document_ = await loadingTask.promise
        if (cancelled) return

        const host = canvasHostRef.current
        if (!host) return
        host.replaceChildren()

        const pageCount = Math.min(document_.numPages, MAX_PAGES)
        const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)

        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
          const page = await document_.getPage(pageNumber)
          if (cancelled) return

          const unscaled = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (width / unscaled.width) * ratio })

          const canvas = document.createElement("canvas")
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          // CSS size is the layout size; the extra device pixels above are
          // what keep the text crisp on a phone.
          canvas.style.width = "100%"
          canvas.style.height = "auto"
          canvas.style.display = "block"
          canvas.className = "rounded-md bg-white shadow-[var(--shadow-subtle)]"
          canvas.setAttribute("role", "img")
          canvas.setAttribute(
            "aria-label",
            pageCount > 1 ? `${label} — page ${pageNumber} of ${pageCount}` : label
          )

          const context = canvas.getContext("2d")
          if (!context) throw new Error("This browser could not provide a drawing surface.")

          host.append(canvas)
          await page.render({ canvas, canvasContext: context, viewport }).promise
          page.cleanup()
          if (cancelled) return
        }

        setStatus({ kind: "ready", pages: pageCount })
      } catch (error) {
        if (cancelled) return
        console.error("[pdf-preview] could not render the document", error)
        const fallback = canShowPdfInline()
        Sentry.captureException(error, {
          tags: { feature: "pdf-preview", fallback: fallback ? "native-viewer" : "none" },
        })
        setStatus(
          fallback
            ? { kind: "native" }
            : {
                kind: "error",
                message: "The preview could not be drawn here. Open or download the document instead.",
              }
        )
      }
    })()

    return () => {
      cancelled = true
      void task?.destroy().catch(() => {})
    }
  }, [src, width, label])

  return (
    <div
      // `scrollbar-gutter: stable` reserves the scrollbar's width up front. On
      // a Mac with a mouse (classic, non-overlay scrollbars) the bar appears
      // only once the pages are drawn, and without the reserve that narrows
      // the host, which the width effect reads as a resize and redraws every
      // page a second time.
      className={cn(
        "relative w-full overflow-y-auto overscroll-contain rounded-md bg-sunken p-2 [scrollbar-gutter:stable]",
        className
      )}
    >
      {status.kind === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2 p-4 text-small text-muted-foreground"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
          {status.message}
        </p>
      ) : null}

      {status.kind === "native" ? (
        // Same-origin, session-authenticated, and the exact bytes PDF.js
        // would have drawn. `min-h` because a frame has no intrinsic height.
        <iframe src={src} title={label} className="block h-[60vh] min-h-96 w-full rounded-md bg-white" />
      ) : null}

      {status.kind === "loading" ? (
        <p className="flex items-center justify-center gap-2 p-8 text-small text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Preparing the preview…
        </p>
      ) : null}

      {/* Canvases are appended here imperatively: React never owns them, so a
          redraw at a new width replaces pixels rather than reconciling nodes. */}
      <div ref={canvasHostRef} className="flex flex-col gap-2" aria-busy={status.kind === "loading"} />
    </div>
  )
}
