"use client"

import * as React from "react"

import { isAppleMobile, isStandaloneDisplay } from "@/lib/pwa/pwa-environment"

const STANDALONE_QUERY = "(display-mode: standalone)"

function subscribeDisplayMode(onChange: () => void): () => void {
  const query = window.matchMedia(STANDALONE_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function readStandalone(): boolean {
  return isStandaloneDisplay(
    window.matchMedia(STANDALONE_QUERY).matches,
    (navigator as Navigator & { standalone?: boolean }).standalone
  )
}

const noopSubscribe = () => () => {}

function readAppleMobile(): boolean {
  return isAppleMobile(navigator.userAgent, navigator.maxTouchPoints)
}

/**
 * Where the dashboard is running. Both values are false during server
 * rendering and the first client render, then settle — so nothing that
 * depends on them may change the page's layout before hydration.
 */
export function useAppEnvironment(): { standalone: boolean; appleMobile: boolean; hydrated: boolean } {
  const standalone = React.useSyncExternalStore(subscribeDisplayMode, readStandalone, () => false)
  const appleMobile = React.useSyncExternalStore(noopSubscribe, readAppleMobile, () => false)
  const hydrated = React.useSyncExternalStore(noopSubscribe, () => true, () => false)
  return { standalone, appleMobile, hydrated }
}
