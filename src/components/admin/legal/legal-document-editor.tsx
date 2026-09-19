"use client"

import * as React from "react"
import { ArrowUpRight, Check, Copy, Plus } from "lucide-react"

import { AutosaveIndicator } from "@/components/admin/legal/autosave-indicator"
import { LegalSectionEditor } from "@/components/admin/legal/legal-section-editor"
import { SettingsField, SettingsPanel } from "@/components/admin/settings/settings-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAutosave } from "@/hooks/use-autosave"
import { addLegalSectionAction, updateLegalDocumentAction } from "@/lib/actions/legal.actions"
import { LEGAL_LIMITS, type LegalDocumentMeta } from "@/lib/legal/legal-documents"
import { LEGAL_PLACEHOLDERS, type LegalPlaceholderValues } from "@/lib/legal/legal-text"
import type { AdminLegalDocument } from "@/lib/queries/legal.queries"

/**
 * Settings → Legal documents → one document.
 *
 * Everything saves as it is typed; there is no Save button to forget. The
 * page re-renders from the server after a structural change (add, move, show,
 * hide, delete), and each section keeps its own unsaved text across that
 * re-render because it is keyed by its id.
 */
export function LegalDocumentEditor({
  document,
  meta,
  values,
  canEdit,
}: {
  document: AdminLegalDocument
  meta: LegalDocumentMeta
  values: LegalPlaceholderValues
  canEdit: boolean
}) {
  const [title, setTitle] = React.useState(document.title)
  const [summary, setSummary] = React.useState(document.summary)
  const [addError, setAddError] = React.useState<string | null>(null)
  const [focusId, setFocusId] = React.useState<string | null>(null)
  const [adding, startAdding] = React.useTransition()

  const autosave = useAutosave({
    value: { title, summary },
    save: (value) => updateLegalDocumentAction({ kind: document.kind, ...value }),
    enabled: canEdit,
  })
  const fieldError = (name: "title" | "summary") =>
    autosave.status.state === "error" ? autosave.status.fieldErrors?.[name]?.[0] : undefined

  // Published sections are numbered as customers see them; hidden ones are not.
  let published = 0
  const numbers = document.sections.map((section) => (section.isVisible ? ++published : null))

  function addSection() {
    setAddError(null)
    startAdding(async () => {
      const result = await addLegalSectionAction({ kind: document.kind })
      if (result.ok) setFocusId(result.sectionId)
      else setAddError(result.message)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsPanel
        id="document-details"
        title={meta.label}
        description={meta.purpose}
        action={
          <Button
            render={<a href={meta.path} target="_blank" rel="noopener noreferrer" />}
            variant="outline"
            size="sm"
          >
            View on website
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Button>
        }
      >
        <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-4">
          <SettingsField label="Title" htmlFor="legal-title" error={fieldError("title")}>
            <Input
              id="legal-title"
              value={title}
              maxLength={LEGAL_LIMITS.titleMax}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={autosave.flush}
              aria-invalid={fieldError("title") ? true : undefined}
            />
          </SettingsField>
          <SettingsField
            label="Introduction"
            htmlFor="legal-summary"
            hint={
              meta.kind === "PAYMENT_SAFETY"
                ? "Shown as a highlighted warning at the top of the page."
                : "Shown under the title, before the numbered sections."
            }
            error={fieldError("summary")}
          >
            <Textarea
              id="legal-summary"
              value={summary}
              maxLength={LEGAL_LIMITS.summaryMax}
              onChange={(event) => setSummary(event.target.value)}
              onBlur={autosave.flush}
              aria-invalid={fieldError("summary") ? true : undefined}
              className="min-h-24 leading-relaxed"
            />
          </SettingsField>
        </fieldset>
        {canEdit ? <AutosaveIndicator status={autosave.status} onRetry={autosave.retry} /> : null}
      </SettingsPanel>

      <WritingGuide />

      <section aria-labelledby="sections-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="sections-heading" className="text-h3">
              Sections
            </h2>
            <p className="text-small text-muted-foreground">
              {published} of {document.sections.length} shown on the website. Changes are live as soon as they save.
            </p>
          </div>
        </div>

        <ol className="flex flex-col gap-4">
          {document.sections.map((section, index) => (
            <LegalSectionEditor
              key={section.id}
              section={section}
              number={numbers[index]}
              isFirst={index === 0}
              isLast={index === document.sections.length - 1}
              canEdit={canEdit}
              values={values}
              autoFocus={section.id === focusId}
            />
          ))}
        </ol>

        {canEdit ? (
          <div className="flex flex-col items-start gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={addSection}
              disabled={adding || document.sections.length >= LEGAL_LIMITS.sectionsMax}
            >
              <Plus aria-hidden="true" className="size-4" />
              Add section
            </Button>
            <p className="text-xs text-muted-foreground">
              New sections start hidden. Switch one on when its text is ready.
            </p>
            {addError ? (
              <p role="alert" className="text-small text-destructive">
                {addError}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}

/** How to format text, and the placeholders that fill themselves in from Settings. */
function WritingGuide() {
  const [copied, setCopied] = React.useState<string | null>(null)

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(`{{${token}}}`)
      setCopied(token)
      setTimeout(() => setCopied((current) => (current === token ? null : current)), 1500)
    } catch (error) {
      // No clipboard (an insecure context or a refused permission): the
      // token is printed on the chip, so it can still be typed.
      console.error("[legal] could not copy a placeholder", error)
    }
  }

  return (
    <details className="group rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-subtle)] sm:p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-small font-semibold [&::-webkit-details-marker]:hidden">
        How to format the text, and automatic details
        <span className="text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
        <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">Hide</span>
      </summary>

      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3 text-small">
          <p className="font-medium">Formatting</p>
          <ul className="flex flex-col gap-2 text-muted-foreground">
            <li>Leave an empty line between paragraphs.</li>
            <li>
              Start a line with <code className="rounded bg-muted px-1 font-mono text-foreground">- </code> for a
              bullet point.
            </li>
            <li>
              Start a line with <code className="rounded bg-muted px-1 font-mono text-foreground">1. </code> for a
              numbered step.
            </li>
            <li>
              Put <code className="rounded bg-muted px-1 font-mono text-foreground">**two stars**</code> around words to
              make them bold.
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 text-small">
          <p className="font-medium">Automatic details</p>
          <p className="text-muted-foreground">
            These fill themselves in from Settings, so the documents stay correct when your details change. Click one
            to copy it.
          </p>
          <ul className="flex flex-wrap gap-2">
            {LEGAL_PLACEHOLDERS.map((placeholder) => (
              <li key={placeholder.token}>
                <button
                  type="button"
                  onClick={() => copy(placeholder.token)}
                  title={placeholder.description}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-sunken/60 px-2 font-mono text-xs transition-colors duration-fast hover:border-gold-ink/50 pointer-coarse:min-h-11"
                >
                  {copied === placeholder.token ? (
                    <Check aria-hidden="true" className="size-3 text-success" />
                  ) : (
                    <Copy aria-hidden="true" className="size-3 text-muted-foreground" />
                  )}
                  {`{{${placeholder.token}}}`}
                  <span className="sr-only">— {placeholder.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  )
}
