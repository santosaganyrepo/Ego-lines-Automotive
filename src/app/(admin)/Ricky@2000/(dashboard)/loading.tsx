import { Skeleton } from "@/components/ui/skeleton"

const ROWS = 8

/**
 * Shown while a dashboard page's queries run: a page header, a toolbar and
 * table rows in the shape most dashboard pages take, so the page fills in
 * rather than jumping into place. The sidebar belongs to the layout above
 * and stays put.
 */
export default function AdminLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Loading…</span>

      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex gap-6 border-b border-border bg-sunken px-6 py-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
          {Array.from({ length: ROWS }, (_, index) => (
            <div key={index} className="flex items-center gap-6 border-b border-border px-6 py-4 last:border-b-0">
              <Skeleton className="size-10 shrink-0 rounded-md" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="ml-auto h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
