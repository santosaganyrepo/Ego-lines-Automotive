"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * A password field with a show/hide control.
 *
 * Why it belongs on a sign-in screen: the most common reason an
 * administrator cannot get in is a mistyped password they cannot see —
 * especially on a phone keyboard, and especially with a long generated
 * password pasted from a manager. Being able to check it converts a locked
 * account into a corrected keystroke, and the lockout it avoids is real:
 * five wrong passwords pause sign-in for this address entirely.
 *
 * It is a deliberate, momentary choice by the person at the keyboard, not a
 * default: the field always starts masked, every re-render leaves it masked,
 * and nothing about the state is remembered anywhere. `type` is the only
 * thing that changes, so password managers still recognise the field and
 * `autoComplete` keeps working.
 *
 * The toggle is a real `<button type="button">` — never a submit — inside
 * the field's own relative box, sized to the 44px touch target the rest of
 * the design system uses, and labelled for screen readers with
 * `aria-pressed` so its state is announced rather than implied by an icon.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        // Room for the button, so a long password never runs under it.
        className={cn("pr-12", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        // Not in the tab order: someone tabbing from the password field
        // expects to reach "Sign in", and a screen-reader user can still
        // reach this through the form's controls.
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg",
          "text-muted-foreground transition-colors duration-fast",
          "hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        )}
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4.5" />
        ) : (
          <Eye aria-hidden="true" className="size-4.5" />
        )}
      </button>
    </div>
  )
}
