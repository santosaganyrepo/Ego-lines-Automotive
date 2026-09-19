import { PlusSquare, Share } from "lucide-react"

/**
 * How to add the dashboard to the Home Screen on an iPhone or iPad, where no
 * browser can offer an install button (Apple does not allow it).
 *
 * Shared by the top-bar dialog and Settings → Notifications.
 */
export function AppleInstallSteps() {
  return (
    <ol className="flex flex-col gap-3 text-small">
      <li className="flex items-start gap-3">
        <StepNumber value={1} />
        <span>
          Tap the <strong className="font-semibold">Share</strong> button{" "}
          <Share aria-hidden="true" className="inline size-4 -translate-y-px text-muted-foreground" /> in the browser
          toolbar.
        </span>
      </li>
      <li className="flex items-start gap-3">
        <StepNumber value={2} />
        <span>
          Scroll down and choose <strong className="font-semibold">Add to Home Screen</strong>{" "}
          <PlusSquare aria-hidden="true" className="inline size-4 -translate-y-px text-muted-foreground" />.
        </span>
      </li>
      <li className="flex items-start gap-3">
        <StepNumber value={3} />
        <span>
          Tap <strong className="font-semibold">Add</strong>, then open the dashboard from its new icon on your Home
          Screen and sign in there.
        </span>
      </li>
    </ol>
  )
}

function StepNumber({ value }: { value: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold-ink tabular-nums"
    >
      {value}
    </span>
  )
}
