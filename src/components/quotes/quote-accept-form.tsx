"use client"

import { useActionState, useEffect, useId } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { acceptQuoteAction, type QuoteAcceptanceFormState } from "@/lib/actions/quote-acceptance.actions"
import { ACCEPTANCE_NOTE_MAX_LENGTH } from "@/lib/quotes/quote-acceptance"

const INITIAL_STATE: QuoteAcceptanceFormState = { status: "idle" }

/**
 * The customer's "Accept quotation" button, with an optional message.
 *
 * The fingerprint is of the figures this page was rendered with; the server
 * refuses the acceptance if the quotation has changed since, and the page is
 * refreshed so the customer sees — and can accept — the new figures instead.
 * On success the page is refreshed too, so it shows the accepted state from
 * the server rather than a client-side guess.
 */
export function QuoteAcceptForm({ token, fingerprint, total }: { token: string; fingerprint: string; total: string }) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(acceptQuoteAction, INITIAL_STATE)
  const noteId = useId()

  useEffect(() => {
    if (state.status === "accepted" || state.stale) router.refresh()
  }, [state, router])

  if (state.status === "accepted") {
    return (
      <Alert role="status">
        <CheckCircle2 aria-hidden="true" className="text-success" />
        <AlertDescription>Thank you — your acceptance has been sent to our team.</AlertDescription>
      </Alert>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="fingerprint" value={fingerprint} />

      {state.status === "error" && state.message ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={noteId}>
          Message for our team <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={noteId}
          name="note"
          maxLength={ACCEPTANCE_NOTE_MAX_LENGTH}
          placeholder="Anything we should know — a preferred payment method, a question about delivery…"
          className="min-h-24"
        />
      </div>

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
        {isPending ? "Sending…" : `Accept quotation · ${total}`}
      </Button>
      <p className="text-small text-muted-foreground">
        Accepting tells our team you would like to go ahead at this price. We will then confirm your order and send
        the payment details — nothing is charged by pressing this button.
      </p>
    </form>
  )
}
