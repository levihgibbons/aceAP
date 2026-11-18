/**
 * AceAP mark + wordmark.
 *   <Logo />                 <Logo showWordmark={false} />
 */
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <path
        d="M9.5 23 16 9l6.5 14"
        fill="none"
        className="stroke-on-accent"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12.3 18h7.4" className="stroke-on-accent" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="24.5" cy="8.5" r="2.2" className="fill-on-accent" opacity="0.85" />
    </svg>
  );
}

export function Logo({ showWordmark = true, className }: { showWordmark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark ? (
        <span className="font-display text-[1.1875rem] font-semibold tracking-[-0.02em] text-ink">
          Ace<span className="text-accent">AP</span>
        </span>
      ) : (
        <span className="sr-only">AceAP</span>
      )}
    </span>
  );
}
