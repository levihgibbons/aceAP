/**
 * PageSkeleton — generic loading placeholder shaped like a shell page
 * (header + cards). Used by the segment loading.tsx files; pages with a very
 * different layout can add their own loading.tsx.
 */
import { Skeleton } from "@/components/ui/States";

export function PageSkeleton({ label = "Loading page" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}…</span>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-card border border-line bg-surface p-5 shadow-card">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
            <Skeleton className="mt-3 h-3 w-2/3" />
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card">
        <Skeleton className="h-4 w-40" />
        <div className="mt-5 space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    </div>
  );
}
