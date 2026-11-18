/**
 * Small primitives.
 *   <KeyValue items={[{ label: "Due", value: "Nov 20" }, { label: "Points", value: 10 }]} />
 *   <Kbd>Esc</Kbd>
 *   <Divider />   <Divider label="or" />
 *   <VisuallyHidden>Opens in a new tab</VisuallyHidden>
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface KeyValueItem {
  label: ReactNode;
  value: ReactNode;
}

export function KeyValue({
  items,
  layout = "inline",
  className,
}: {
  items: KeyValueItem[];
  /** inline: label left / value right. stacked: label above value, in a grid. */
  layout?: "inline" | "stacked";
  className?: string;
}) {
  if (layout === "stacked") {
    return (
      <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3", className)}>
        {items.map((item, i) => (
          <div key={i} className="min-w-0">
            <dt className="text-xs font-medium text-muted">{item.label}</dt>
            <dd className="mt-1 text-sm text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className={cn("divide-y divide-line text-sm", className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="text-muted">{item.label}</dt>
          <dd className="text-right font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1 font-mono text-[0.6875rem] font-medium text-muted shadow-[inset_0_-1px_0_var(--line-strong)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Divider({ label, className }: { label?: ReactNode; className?: string }) {
  if (!label) return <hr className={cn("my-6 border-0 border-t border-line", className)} />;
  return (
    <div role="separator" className={cn("my-6 flex items-center gap-3 text-xs text-faint", className)}>
      <span className="h-px flex-1 bg-line" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
