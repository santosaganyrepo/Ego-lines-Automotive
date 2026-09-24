"use client"

import { useState } from "react"
import { AlertTriangle, Download, ExternalLink, FileText } from "lucide-react"

import { PdfPreview } from "@/components/admin/pdf-preview"
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
import { useQuotePricing } from "@/lib/quotes/quote-pricing-context"

/**
 * "Generate PDF" — lets an operator see the exact branded quotation a
 * customer would receive, without going through the send flow first.
 *
 * The document is the real one: `/api/quotes/[id]/preview`, the same route
 * the dispatch dialog's "Preview quotation" link opens and the same bytes
 * the customer is emailed. It used to be shown in an `<iframe>`, which works
 * on a desktop browser and on no phone — Chrome on Android offers a download
 * instead of rendering, and Safari on iPhone shows at best a cropped first
 * page — so the only way to check a quotation on a phone was to download it
 * first. `PdfPreview` draws the pages itself instead, which behaves the same
 * everywhere; see that component for how and why.
 *
 * Nothing is fetched or rendered until the dialog is opened.
 */
export function QuotePdfDialog({ quoteId }: { quoteId: string }) {
  const { totals, isDirty } = useQuotePricing()
  const [open, setOpen] = useState(false)

  const canGenerate = totals.itemLineCount > 0
  const previewHref = `/api/quotes/${quoteId}/preview`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canGenerate}
            title={canGenerate ? undefined : "Add at least one item to generate a PDF."}
          />
        }
      >
        <FileText aria-hidden="true" />
        Generate PDF
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Quotation PDF</DialogTitle>
        </DialogHeader>

        {isDirty ? (
          <p className="flex items-center gap-2 text-xs text-warning">
            <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
            Unsaved changes are not included.
          </p>
        ) : null}

        {open ? (
          <PdfPreview
            src={previewHref}
            label="Quotation"
            // Tall enough to read a page on a desktop, short enough that the
            // actions below stay on screen on a phone.
            className="max-h-[60vh] sm:max-h-[70vh]"
          />
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button render={<a href={previewHref} download />} type="button" variant="outline" size="sm">
              <Download aria-hidden="true" />
              Download
            </Button>
            {/* The browser's own viewer, for an operator who wants to print,
                search or zoom beyond what this dialog offers. */}
            <Button
              render={<a href={previewHref} target="_blank" rel="noopener noreferrer" />}
              type="button"
              variant="ghost"
              size="sm"
            >
              <ExternalLink aria-hidden="true" />
              Open in a new tab
            </Button>
          </div>
          <DialogClose render={<Button type="button" variant="outline" size="sm" />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
