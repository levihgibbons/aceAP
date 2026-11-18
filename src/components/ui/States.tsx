/**
 * Empty, error and loading states.
 *   <EmptyState icon={<BookOpen />} title="No assignments yet"
 *     description="When your teacher assigns work it shows up here." action={<ButtonLink …/>} />
 *   <ErrorState description="We couldn't load your progress." retry={reset} />        (client: function)
 *   <ErrorState description="…" retry={{ href: "/app", label: "Back to home" }} />   (server: link)
 *   <Skeleton className="h-6 w-40" />
 * Both render their title as an <h2> (they usually sit right under the page's
 * <h1>); pass headingLevel={3} when the state is nested inside an h2 section
 * or a dialog, or headingLevel={1} when the state is the whole page, so the
 * heading outline never skips a level.
 */
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "./Button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Render without the dashed border (e.g. inside a Card). */
  bare?: boolean;
  /** Heading level of the title (default 2). */
  headingLevel?: HeadingLevel;
}

type HeadingLevel = 1 | 2 | 3 | 4;

function StateTitle({ level = 2, children }: { level?: HeadingLevel; children: ReactNode }) {
  const Tag = `h${level}` as const;
  return <Tag className="font-display text-base font-semibold text-ink">{children}</Tag>;
}

export function EmptyState({ icon, title, description, action, className, bare = false, headingLevel }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-10 text-center sm:py-12",
        !bare && "rounded-card border border-dashed border-line-strong bg-surface-2",
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="mb-4 inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-muted shadow-card [&>svg]:size-5"
        >
          {icon}
        </span>
      ) : null}
      <StateTitle level={headingLevel}>{title}</StateTitle>
      <div className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{description}</div>
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export type RetryAction = (() => void) | { href: string; label?: string };

export interface ErrorStateProps {
  title?: ReactNode;
  description: ReactNode;
  retry?: RetryAction;
  /** Optional reference shown in small print (e.g. error.digest). */
  reference?: string;
  className?: string;
  /** Heading level of the title (default 2). */
  headingLevel?: HeadingLevel;
}

export function ErrorState({ title = "Something went wrong", description, retry, reference, className, headingLevel }: ErrorStateProps) {
  return (
    <div role="alert" className={cn("flex flex-col items-center rounded-card border border-line bg-surface px-6 py-10 text-center", className)}>
      <span aria-hidden="true" className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-bad-soft text-bad">
        <AlertTriangle className="size-5" />
      </span>
      <StateTitle level={headingLevel}>{title}</StateTitle>
      <div className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{description}</div>
      {retry ? (
        <div className="mt-5">
          {typeof retry === "function" ? (
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          ) : (
            <ButtonLink variant="secondary" href={retry.href}>
              {retry.label ?? "Try again"}
            </ButtonLink>
          )}
        </div>
      ) : null}
      {reference ? <p className="mt-4 font-mono text-[0.6875rem] text-faint">Reference: {reference}</p> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-sunken", className)} />;
}
