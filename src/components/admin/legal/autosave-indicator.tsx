"use client"

import { AlertCircle, Check, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AutosaveStatus } from "@/hooks/use-autosave"
import { cn } from "@/lib/utils"

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
}

/** "Saving…", "Saved at 14:02", or what went wrong — announced politely to screen readers. */
export function AutosaveIndicator({
  status,
  onRetry,
  className,
}: {
  status: AutosaveStatus
  onRetry: () => void
  className?: string
}) {
  return (
    <div aria-live="polite" className={cn("flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 text-xs", className)}>
      {status.state === "saving" ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          Saving…
        </span>
      ) : status.state === "pending" ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-gold-ink" />
          Unsaved changes
        </span>
      ) : status.state === "error" ? (
        <>
          <span className="inline-flex items-center gap-1.5 text-destructive">
            <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
            {status.message}
          </span>
          <Button type="button" variant="outline" size="xs" onClick={onRetry}>
            Try again
          </Button>
        </>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Check aria-hidden="true" className="size-3.5 text-success" />
          {status.savedAt ? `Saved at ${formatTime(status.savedAt)}` : "All changes saved"}
        </span>
      )}
    </div>
  )
}
