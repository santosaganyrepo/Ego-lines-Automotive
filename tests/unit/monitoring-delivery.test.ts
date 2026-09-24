import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Error reports must survive the Vercel function being suspended after the
 * response (src/lib/monitoring/serverless-flush.ts).
 */

type Handler = (event: { type?: string }) => void

const sentry = vi.hoisted(() => ({
  handlers: new Map<string, (event: { type?: string }) => void>(),
  flush: vi.fn(async () => true),
}))

vi.mock("@sentry/nextjs", () => ({
  getClient: () => ({
    on: (hook: string, handler: Handler) => sentry.handlers.set(hook, handler),
  }),
  flush: sentry.flush,
}))

const CONTEXT = Symbol.for("@vercel/request-context")

describe("flushErrorsBeforeSuspend", () => {
  beforeEach(() => {
    sentry.handlers.clear()
    sentry.flush.mockClear()
  })
  afterEach(() => {
    delete (globalThis as Record<symbol, unknown>)[CONTEXT]
  })

  async function registered(): Promise<Handler> {
    const { flushErrorsBeforeSuspend } = await import("@/lib/monitoring/serverless-flush")
    flushErrorsBeforeSuspend()
    const handler = sentry.handlers.get("preprocessEvent")
    expect(handler).toBeDefined()
    return handler!
  }

  it("keeps a Vercel function alive until a captured error is flushed", async () => {
    const waitUntil = vi.fn()
    ;(globalThis as Record<symbol, unknown>)[CONTEXT] = { get: () => ({ waitUntil }) }

    ;(await registered())({})

    expect(sentry.flush).toHaveBeenCalledTimes(1)
    expect(waitUntil).toHaveBeenCalledTimes(1)
    expect(waitUntil.mock.calls[0]![0]).toBeInstanceOf(Promise)
  })

  it("does not hold requests open for sampled performance transactions", async () => {
    const waitUntil = vi.fn()
    ;(globalThis as Record<symbol, unknown>)[CONTEXT] = { get: () => ({ waitUntil }) }

    ;(await registered())({ type: "transaction" })

    expect(waitUntil).not.toHaveBeenCalled()
    expect(sentry.flush).not.toHaveBeenCalled()
  })

  it("does nothing off Vercel, where the process sends on its own", async () => {
    ;(await registered())({})
    expect(sentry.flush).not.toHaveBeenCalled()
  })
})
