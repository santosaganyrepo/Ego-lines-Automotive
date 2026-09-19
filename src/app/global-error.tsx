"use client"

import * as React from "react"
import * as Sentry from "@sentry/nextjs"

/**
 * The last-resort error screen: shown only when the root layout itself fails,
 * so it cannot use the site's layout, fonts or styles and must render its own
 * <html> and <body>. Every page-level failure is handled by the nearer
 * error.tsx boundaries instead.
 *
 * The error is reported to Sentry (when configured); the visitor sees a short
 * message and a way back, never the error itself.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f0f",
          color: "#f5f3ee",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, lineHeight: 1.3, margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 24px", color: "#b9b5ad", lineHeight: 1.6 }}>
            The page could not be loaded. Please try again — if it keeps happening, contact us and quote the reference
            below.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: 44,
                padding: "0 22px",
                border: 0,
                borderRadius: 8,
                background: "#d9b04c",
                color: "#141414",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* A full page load, not a client navigation: the app shell is what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                minHeight: 44,
                padding: "0 22px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#f5f3ee",
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Go to the homepage
            </a>
          </div>
          {error.digest ? (
            <p style={{ marginTop: 24, fontSize: 12, color: "#8a867e" }}>Reference: {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  )
}
