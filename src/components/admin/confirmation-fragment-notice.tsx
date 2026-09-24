"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/**
 * Reads the outcome Supabase left in the URL fragment, and says what it was.
 *
 * A fragment never reaches a server, so `/auth/confirm` sees an empty-looking
 * link and forwards here — the browser re-applies the fragment across that
 * redirect, which is the only way this information can be recovered at all.
 *
 * Deliberately read-only. Where the fragment carries session tokens the
 * change it confirms (an email address) has already been made by Supabase
 * before this page loads, so there is nothing left to authorise; the tokens
 * are never read, never sent anywhere, and the fragment is cleared from the
 * address bar as soon as it has been classified, so it does not sit in
 * history or get copied out of the URL bar.
 */

type Outcome =
  | { kind: "reading" }
  | { kind: "confirmed" }
  | { kind: "expired" }
  | { kind: "unknown" }

function classify(hash: string): Outcome {
  const fragment = new URLSearchParams(hash.replace(/^#/, ""))

  if (fragment.get("error") ?? fragment.get("error_code")) {
    return { kind: "expired" }
  }
  if (fragment.get("access_token") ?? fragment.get("refresh_token")) {
    return { kind: "confirmed" }
  }
  return { kind: "unknown" }
}

export function ConfirmationFragmentNotice({
  continueHref,
  signInHref,
}: {
  continueHref: string
  signInHref: string
}) {
  const [outcome, setOutcome] = React.useState<Outcome>({ kind: "reading" })

  React.useEffect(() => {
    const hash = window.location.hash

    // Deferred rather than called from the effect body: a synchronous
    // setState here runs during commit and forces an immediate cascading
    // re-render — the same deferral, for the same reason, as
    // useHeroBehindHeader in site-header.tsx.
    queueMicrotask(() => setOutcome(classify(hash)))

    if (hash) {
      // Drop the fragment without adding a history entry, so the tokens are
      // not left in the address bar for the next person at this screen.
      window.history.replaceState(null, "", window.location.pathname + window.location.search)
    }
  }, [])

  if (outcome.kind === "reading") {
    return (
      <p className="inline-flex items-center gap-2 text-small text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Checking this link…
      </p>
    )
  }

  if (outcome.kind === "confirmed") {
    return (
      <div className="flex flex-col gap-6">
        <Alert>
          <CheckCircle2 aria-hidden="true" className="text-success" />
          <AlertDescription>
            Confirmed. If this was an email-address change, sign in with the new address from now on.
          </AlertDescription>
        </Alert>
        <Button render={<Link href={signInHref} />} className="w-full">
          Go to sign in
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertDescription>
          {outcome.kind === "expired"
            ? "That link has expired or has already been used. Links can only be opened once."
            : "There was nothing to confirm in that link. It may have been altered by your email app."}
        </AlertDescription>
      </Alert>
      <div className="flex flex-col gap-3">
        <Button render={<Link href={signInHref} />} className="w-full">
          Go to sign in
        </Button>
        <Button render={<Link href={continueHref} />} variant="outline" className="w-full">
          Open the dashboard
        </Button>
      </div>
    </div>
  )
}
