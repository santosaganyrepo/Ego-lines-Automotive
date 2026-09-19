import * as React from "react"

import { cn } from "@/lib/utils"
import {
  fillPlaceholders,
  parseLegalBody,
  type LegalPlaceholderValues,
  type LegalSpan,
} from "@/lib/legal/legal-text"

/**
 * A legal section's text, typeset for reading.
 *
 * The text is the dealership's own plain text (see legal-text.ts for the
 * format): it is parsed into paragraphs and lists and rendered as React
 * elements, so it can never inject markup. Shared by the public pages and
 * the dashboard's preview, which is why it carries no "use client" and no
 * server-only import.
 */
export function LegalBody({
  text,
  values,
  className,
}: {
  text: string
  values: LegalPlaceholderValues
  className?: string
}) {
  const blocks = parseLegalBody(fillPlaceholders(text, values))

  if (blocks.length === 0) return null

  return (
    <div className={cn("flex flex-col gap-4 text-body leading-[1.75] text-foreground/85", className)}>
      {blocks.map((block, index) => {
        if (block.kind === "paragraph") {
          return (
            <p key={index} className="text-pretty">
              <Spans spans={block.spans} />
            </p>
          )
        }

        if (block.kind === "numbered") {
          return (
            <ol key={index} className="flex list-none flex-col gap-2.5 [counter-reset:legal-item]">
              {block.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="relative pl-9 [counter-increment:legal-item] before:absolute before:top-0 before:left-0 before:font-heading before:font-semibold before:text-gold-ink before:tabular-nums before:content-[counter(legal-item)'.']"
                >
                  <Spans spans={item} />
                </li>
              ))}
            </ol>
          )
        }

        return (
          <ul key={index} className="flex flex-col gap-2.5">
            {block.items.map((item, itemIndex) => (
              <li
                key={itemIndex}
                className="relative pl-6 before:absolute before:top-[0.72em] before:left-1 before:size-1.5 before:rounded-full before:bg-gold-ink/80"
              >
                <Spans spans={item} />
              </li>
            ))}
          </ul>
        )
      })}
    </div>
  )
}

function Spans({ spans }: { spans: LegalSpan[] }) {
  return spans.map((span, index) =>
    span.bold ? (
      <strong key={index} className="font-semibold text-foreground">
        {span.text}
      </strong>
    ) : (
      <React.Fragment key={index}>{span.text}</React.Fragment>
    )
  )
}
