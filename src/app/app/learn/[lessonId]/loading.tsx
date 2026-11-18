import { Skeleton } from "@/components/ui";

/** Lesson-shaped loading state: header, navigation column and lesson body. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading lesson…</span>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="xl:grid xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-8">
        <div className="hidden space-y-3 xl:block">
          <Skeleton className="h-4 w-32" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
        <div className="min-w-0 space-y-6">
          <Skeleton className="h-14 w-full rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-card" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
