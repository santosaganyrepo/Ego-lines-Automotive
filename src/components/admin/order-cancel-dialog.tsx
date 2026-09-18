"use client"

import { useActionState, useId, useState } from "react"
import { Ban, Loader2, TriangleAlert } from "lucide-react"

import { cancelOrderAction } from "@/lib/actions/order.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/format-currency"

const IDLE = { status: "idle" as const }

/**
 * Cancels an order — from its page, or from its row in the orders list.
 *
 * ── A paid order can be cancelled, deliberately ───────────────────────
 * Money already taken does not block cancellation: an operator has to be able
 * to close a dead order when it dies. So the dialog carries the weight a
 * refusal used to. When confirmed money is on the order it leads with the
 * amount, states plainly that cancelling does not move it, and asks for the
 * order number to be typed out before the button unlocks. The action checks
 * the same thing server-side, under the order lock, against the money held at
 * that moment — the dialog is guidance, not the guard.
 *
 * The refund question is asked rather than assumed, because whether the money
 * has physically gone back is a fact only the operator has.
 *
 * `amountPaid` is the order's live finance figure, derived from confirmed
 * payments — the same number the payments panel shows.
 */
export function OrderCancelDialog({
  orderId,
  orderNumber,
  amountPaid,
  trigger = "button",
}: {
  orderId: string
  orderNumber: string
  amountPaid: number
  /** `button` on the order page; `compact` in a table row. */
  trigger?: "button" | "compact"
}) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [state, formAction, isPending] = useActionState(cancelOrderAction, IDLE)
  const reasonId = useId()
  const refundId = useId()
  const confirmId = useId()

  const hasPayments = amountPaid > 0
  const confirmed = !hasPayments || typed.trim().toUpperCase() === orderNumber.toUpperCase()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTyped("")
      }}
    >
      <DialogTrigger
        render={
          trigger === "compact" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Cancel order ${orderNumber}`}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            />
          ) : (
            <Button type="button" variant="destructive" size="default" />
          )
        }
      >
        <Ban aria-hidden="true" className="size-4" />
        {trigger === "compact" ? "Cancel" : "Cancel order"}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel order {orderNumber}?</DialogTitle>
        </DialogHeader>

        {hasPayments ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="flex flex-col gap-1 text-small">
              <p className="font-semibold text-destructive">
                The customer has already paid {formatCurrency(amountPaid)} on this order.
              </p>
              <p className="text-foreground/80">
                Cancelling does not return that money. You must arrange the refund with the customer yourself, then
                record it — below, or later from the payments panel. Until then the customer is owed{" "}
                {formatCurrency(amountPaid)}.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 text-small">
          <p className="font-medium text-foreground">Cancelling this order will:</p>
          <ul className="flex list-disc flex-col gap-1 pl-6 text-muted-foreground">
            <li>close it permanently — a cancelled order cannot be reopened;</li>
            <li>put a vehicle it reserved back on sale, and return reserved parts to stock;</li>
            <li>stop its tracking from being updated.</li>
          </ul>
        </div>

        {state.status === "error" && state.message ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-small text-destructive">
            {state.message}
          </p>
        ) : null}

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="orderId" value={orderId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor={reasonId} className="text-xs font-medium text-muted-foreground">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={reasonId}
              name="reason"
              rows={2}
              minLength={3}
              maxLength={500}
              required
              placeholder="Customer withdrew before shipping"
              className="min-h-16 rounded-md border-input px-3 py-2 text-small"
            />
            <p className="text-xs text-muted-foreground">Recorded on the order&rsquo;s audit trail.</p>
          </div>

          {hasPayments ? (
            <>
              <label
                htmlFor={refundId}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-small"
              >
                <input
                  id={refundId}
                  name="refundPayments"
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-input accent-destructive"
                />
                <span className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">
                    Also mark {formatCurrency(amountPaid)} as refunded
                  </span>
                  <span className="text-muted-foreground">
                    Tick only if the money has actually been returned to the customer. This writes a refund to the
                    payment ledger and cannot be undone.
                  </span>
                </span>
              </label>

              <div className="flex flex-col gap-2">
                <Label htmlFor={confirmId} className="text-xs font-medium text-muted-foreground">
                  Type <span className="font-mono text-foreground">{orderNumber}</span> to confirm
                </Label>
                <Input
                  id={confirmId}
                  name="confirmOrderNumber"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={typed.length > 0 && !confirmed ? true : undefined}
                  className="font-mono"
                />
              </div>
            </>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Keep order</DialogClose>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending || !confirmed}
              className={cn(hasPayments && "bg-destructive text-white hover:bg-destructive/90")}
            >
              {isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {hasPayments ? "Cancel paid order" : "Cancel order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
