/**
 * The browser's "install this app" offer, held from the moment it arrives.
 *
 * Chrome and Edge fire `beforeinstallprompt` once, early, on whichever
 * dashboard page loads first — often the sign-in page. It is captured here,
 * outside React, so the install button can use it later on any page. Calling
 * `preventDefault()` replaces the browser's own banner with the dashboard's
 * quieter button: installing stays entirely optional.
 *
 * Safari (iPhone and Mac) and Firefox never fire the event; the UI offers
 * instructions there instead.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface InstallState {
  /** The browser is offering installation right now. */
  canPrompt: boolean
  /** Installed during this visit. */
  installed: boolean
}

let promptEvent: BeforeInstallPromptEvent | null = null
let state: InstallState = { canPrompt: false, installed: false }
const listeners = new Set<() => void>()
let capturing = false

function set(next: Partial<InstallState>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}

/** Starts listening. Idempotent; call from the earliest dashboard component. */
export function captureInstallPrompt(): void {
  if (capturing || typeof window === "undefined") return
  capturing = true

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    promptEvent = event as BeforeInstallPromptEvent
    set({ canPrompt: true })
  })
  window.addEventListener("appinstalled", () => {
    promptEvent = null
    set({ canPrompt: false, installed: true })
  })
}

export function subscribeInstallState(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getInstallState(): InstallState {
  return state
}

const SERVER_STATE: InstallState = { canPrompt: false, installed: false }
export function getServerInstallState(): InstallState {
  return SERVER_STATE
}

/** Shows the browser's install dialog. The offer can be used once. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = promptEvent
  if (!event) return "unavailable"

  promptEvent = null
  set({ canPrompt: false })

  try {
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === "accepted") set({ installed: true })
    return outcome
  } catch (error) {
    console.error("[pwa] the install prompt failed", error)
    return "unavailable"
  }
}
