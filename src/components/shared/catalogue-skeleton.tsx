import { Container } from "@/components/layout/container"
import { Skeleton } from "@/components/ui/skeleton"

const CARD_COUNT = 8

/**
 * The shape of a catalogue page while its query runs: the dark opening band,
 * the filter bar, and a grid of cards drawn at the size the real ones will
 * be. The page then fills in rather than jumping into place, and the wait
 * reads as shorter than it would behind a spinner.
 */
export function CatalogueSkeleton({ kind }: { kind: "vehicles" | "parts" }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading {kind}…</span>

      <div aria-hidden="true">
        <div className="flex h-72 flex-col items-center justify-center gap-4 bg-night px-6 md:h-96">
          <Skeleton className="h-3 w-28 bg-white/10" />
          <Skeleton className="h-8 w-full max-w-lg bg-white/10 md:h-10" />
          <Skeleton className="h-8 w-3/4 max-w-sm bg-white/10 md:h-10" />
          <Skeleton className="mt-2 h-4 w-full max-w-md bg-white/8" />
        </div>

        <Container size="wide" className="flex flex-col gap-8 py-12">
          <div className="flex flex-col gap-4 rounded-2xl border border-border p-6">
            <Skeleton className="h-11 w-full" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
            </div>
          </div>

          <Skeleton className="h-4 w-40" />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: CARD_COUNT }, (_, index) => (
              <div key={index} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                <Skeleton className={kind === "vehicles" ? "aspect-[16/10] rounded-none" : "aspect-square rounded-none"} />
                <div className="flex flex-col gap-3 p-6">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  {kind === "vehicles" ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Skeleton className="h-4" />
                        <Skeleton className="h-4" />
                        <Skeleton className="h-4" />
                        <Skeleton className="h-4" />
                      </div>
                      <Skeleton className="mt-2 h-10 w-full" />
                    </>
                  ) : (
                    <Skeleton className="mt-2 h-5 w-1/4" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </div>
  )
}
