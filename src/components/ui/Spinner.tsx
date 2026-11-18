/**
 * Spinner — an inline loading indicator. Decorative by default (aria-hidden);
 * pass `label` to make it announce itself.
 *   <Spinner />            <Spinner label="Loading results" size="lg" />
 */
import { cn } from "@/lib/cn";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const SIZE = { sm: "size-3.5", md: "size-4", lg: "size-6" } as const;

export function Spinner({ size = "md", label, className }: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <svg className={cn("animate-spin", SIZE[size])} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
