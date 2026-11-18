/**
 * PageHeader — the top of every page inside the shell (renders the page's h1).
 *   <PageHeader
 *     breadcrumbs={[{ label: "Courses", href: "/app/courses" }, { label: "Calculus AB" }]}
 *     eyebrow="Unit 2" title="The chain rule" description="…"
 *     actions={<ButtonLink href="…">Start practice</ButtonLink>} />
 * Section — a titled block within a page (renders an h2).
 *   <Section title="Up next" description="…" action={<ButtonLink variant="link" …/>}>…</Section>
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export interface Breadcrumb {
  label: ReactNode;
  href?: string;
}

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, breadcrumbs, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8 animate-rise", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-[0.8125rem] text-muted">
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <li key={i} className="inline-flex min-w-0 items-center gap-1">
                  {crumb.href && !last ? (
                    <Link href={crumb.href} className="truncate rounded hover:text-ink hover:underline underline-offset-4">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate text-ink-2" aria-current={last ? "page" : undefined}>
                      {crumb.label}
                    </span>
                  )}
                  {!last ? <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-faint" /> : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1.5 text-[0.8125rem] font-medium text-accent">{eyebrow}</p> : null}
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-ink text-balance sm:text-[2rem]">
            {title}
          </h1>
          {description ? <div className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">{description}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export interface SectionProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Section({ title, description, action, id, className, children }: SectionProps) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={title ? headingId : undefined} className={cn("mt-10 first:mt-0", className)}>
      {title || action ? (
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <h2 id={headingId} className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">
                {title}
              </h2>
            ) : null}
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
