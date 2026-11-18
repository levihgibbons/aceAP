import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading mastery heatmap…</span>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <Skeleton className="mb-8 h-11 w-full" />
      <div className="overflow-hidden rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="grid grid-cols-[10rem_repeat(4,minmax(0,1fr))] gap-3">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className={i % 5 === 0 ? "h-8 w-32" : "h-8 w-full"} />
          ))}
        </div>
      </div>
    </div>
  );
}
