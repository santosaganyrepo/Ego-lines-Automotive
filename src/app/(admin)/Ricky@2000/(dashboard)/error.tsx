"use client"

import * as React from "react"
import Link from "next/link"

import { ErrorState } from "@/components/shared/error-state"
import { buttonVariants } from "@/components/ui/button"
import { ADMIN_BASE_PATH } from "@/lib/constants/admin-routes"

/**
 * Dashboard error boundary. Keeps the sidebar (the layout sits above it), so
 * an operator can retry or move on without losing their place.
 *
 * The raw message is never shown — server errors can carry query fragments
 * and internal paths. The digest is, so it can be matched to the server log.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error("[admin] route error:", error)
  }, [error])

  return (
    <ErrorState
      title="This page could not be loaded"
      description="The information behind it did not load. Retry now; if it fails again, note the reference below so the failure can be found in the server logs."
      reference={error.digest}
      action={
        <>
          <button type="button" onClick={reset} className={buttonVariants({ variant: "default" })}>
            Retry
          </button>
          <Link href={ADMIN_BASE_PATH} className={buttonVariants({ variant: "outline" })}>
            Back to dashboard
          </Link>
        </>
      }
    />
  )
}
