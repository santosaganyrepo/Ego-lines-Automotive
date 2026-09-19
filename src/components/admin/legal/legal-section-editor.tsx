"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, Eye, EyeOff, PencilLine, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { AutosaveIndicator } from "@/components/admin/legal/autosave-indicator"
import { LegalBody } from "@/components/legal/legal-body"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAutosave } from "@/hooks/use-autosave"
import {
  deleteLegalSectionAction,
  moveLegalSectionAction,
  setLegalSectionVisibilityAction,
  updateLegalSectionAction,
} from "@/lib/actions/legal.actions"
import { LEGAL_LIMITS } from "@/lib/legal/legal-documents"
import type { LegalPlaceholderValues } from "@/lib/legal/legal-text"
import type { AdminLegalSection } from "@/lib/queries/legal.queries"
import { cn } from "@/lib/utils"

/**
 * One section of a legal document in the dashboard.
 *
 * The heading and text save themselves as they are typed. Showing or hiding
 * the section, moving it and deleting it are immediate, confirmed actions —
 * the page re-renders from the server afterwards, so the order and the
 * published state shown here are always the database's, never a guess.
 */
export function LegalSectionEditor({
  section,
  number,
  isFirst,
  isLast,
  canEdit,
  values,
  autoFocus,
}: {
  section: AdminLegalSection
  /** Position among the published sections, or null when hidden. */
  number: number | null
  isFirst: boolean
  isLast: boolean
  canEdit: boolean
  values: LegalPlaceholderValues
  autoFocus: boolean
}) {
  const [heading, setHeading] = React.useState(section.heading)
  const [body, setBody] = React.useState(section.body)
  const [preview, setPreview] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()
  const [visible, setOptimisticVisible] = React.useOptimistic(section.isVisible)

  const headingRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (autoFocus) headingRef.current?.select()
  }, [autoFocus])

  const autosave = useAutosave({
    value: { heading, body },
    save: (value) => updateLegalSectionAction({ sectionId: section.id, ...value }),
    enabled: canEdit,
  })

  const fieldError = (name: "heading" | "body") =>
    autosave.status.state === "error" ? autosave.status.fieldErrors?.[name]?.[0] : undefined

  /** Structural changes: run on the server, then the page re-renders with the result. */
  function act(run: () => Promise<{ ok: boolean; message?: string }>, optimistic?: () => void) {
    setActionError(null)
    startTransition(async () => {
      optimistic?.()
      const result = await run()
      if (!result.ok) setActionError(result.message ?? "That change could not be saved.")
    })
  }

  const headingId = `section-${section.id}-heading`
  const bodyId = `section-${section.id}-body`

  return (
    <li
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 shadow-[var(--shadow-subtle)] transition-colors duration-fast sm:p-6",
        visible ? "border-border" : "border-dashed border-border bg-sunken/50"
      )}
    >
      {/* ── Header: number, publish switch, order and delete ─────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-semibold tabular-nums",
              visible ? "bg-gold/15 text-gold-ink" : "bg-muted text-muted-foreground"
            )}
            aria-label={number === null ? "Hidden section" : `Section ${number}`}
          >
            {number ?? "—"}
          </span>
          <label className="flex cursor-pointer items-center gap-2.5 text-small font-medium">
            <Switch
              checked={visible}
              disabled={!canEdit || pending}
              onCheckedChange={(checked) =>
                act(
                  () => setLegalSectionVisibilityAction({ sectionId: section.id, isVisible: checked }),
                  () => setOptimisticVisible(checked)
                )
              }
            />
            <span className={cn("inline-flex items-center gap-1.5", visible ? "text-foreground" : "text-muted-foreground")}>
              {visible ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
              {visible ? "Shown on the website" : "Hidden from the website"}
            </span>
          </label>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setPreview((current) => !current)}
            aria-pressed={preview}
            aria-label={preview ? "Edit the text" : "Preview as customers see it"}
            title={preview ? "Edit" : "Preview"}
          >
            {preview ? <PencilLine aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
          </Button>
          {canEdit ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isFirst || pending}
                onClick={() => act(() => moveLegalSectionAction({ sectionId: section.id, direction: "up" }))}
                aria-label="Move section up"
                title="Move up"
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isLast || pending}
                onClick={() => act(() => moveLegalSectionAction({ sectionId: section.id, direction: "down" }))}
                aria-label="Move section down"
                title="Move down"
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    aria-label="Delete section"
                    title="Delete"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                }
                title="Delete this section?"
                description={
                  <>
                    “{heading || "Untitled section"}” will be removed from the document. Its text is kept in the
                    security activity log. To take it off the website without losing it, switch it to hidden instead.
                  </>
                }
                confirmLabel="Delete section"
                destructive
                onConfirm={() => act(() => deleteLegalSectionAction({ sectionId: section.id }))}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* ── Heading and text, or the preview ─────────────────────────── */}
      {preview ? (
        <div className="rounded-lg border border-border bg-background px-5 py-4">
          <h3 className="font-heading text-h3">{heading || "Untitled section"}</h3>
          {body.trim() ? (
            <LegalBody text={body} values={values} className="mt-3" />
          ) : (
            <p className="mt-3 text-small text-muted-foreground">This section has no text yet.</p>
          )}
        </div>
      ) : (
        <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor={headingId} className="text-small font-medium">
              Heading
            </label>
            <Input
              ref={headingRef}
              id={headingId}
              value={heading}
              maxLength={LEGAL_LIMITS.headingMax}
              onChange={(event) => setHeading(event.target.value)}
              onBlur={autosave.flush}
              aria-invalid={fieldError("heading") ? true : undefined}
              className="font-heading text-base font-semibold"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={bodyId} className="text-small font-medium">
                Text
              </label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {body.length.toLocaleString("en-GB")} / {LEGAL_LIMITS.bodyMax.toLocaleString("en-GB")}
              </span>
            </div>
            <Textarea
              id={bodyId}
              value={body}
              maxLength={LEGAL_LIMITS.bodyMax}
              onChange={(event) => setBody(event.target.value)}
              onBlur={autosave.flush}
              aria-invalid={fieldError("body") ? true : undefined}
              spellCheck
              className="max-h-[70vh] min-h-40 leading-relaxed"
            />
          </div>
        </fieldset>
      )}

      {/* ── Save state ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        {canEdit ? <AutosaveIndicator status={autosave.status} onRetry={autosave.retry} /> : <span />}
        {section.updatedByName ? (
          <span className="text-xs text-muted-foreground">Last edited by {section.updatedByName}</span>
        ) : null}
      </div>

      {actionError ? (
        <p role="alert" className="text-small text-destructive">
          {actionError}
        </p>
      ) : null}
    </li>
  )
}
