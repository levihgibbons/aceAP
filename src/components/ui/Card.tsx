/**
 * Card — the standard content container.
 *   <Card>
 *     <CardHeader title="Unit 2" description="Derivatives" action={<ButtonLink …/>} />
 *     <CardBody>…</CardBody>
 *     <CardFooter>…</CardFooter>
 *   </Card>
 * `padded` (default true) pads a simple card; set padded={false} when using
 * CardHeader/CardBody/CardFooter, which pad themselves. `interactive` adds a
 * hover/focus-within treatment for cards that contain a primary link.
 */
import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps {
  as?: "div" | "section" | "article" | "li" | "aside";
  padded?: boolean;
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}

export function Card({ as = "div", padded = true, interactive = false, className, children, ...rest }: CardProps) {
  const Tag = as as ElementType;
  return (
    <Tag
      className={cn(
        "relative rounded-card border border-line bg-surface shadow-card",
        padded && "p-5 sm:p-6",
        interactive &&
          "transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-raised focus-within:border-line-strong",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Heading element for the title (default h3). */
  titleAs?: "h2" | "h3" | "h4";
  /** id for the title, e.g. to label the Card via aria-labelledby. */
  titleId?: string;
  className?: string;
}

export function CardHeader({ title, description, action, titleAs = "h3", titleId, className }: CardHeaderProps) {
  const Heading = titleAs;
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6", className)}>
      <div className="min-w-0">
        <Heading id={titleId} className="font-display text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] text-ink">
          {title}
        </Heading>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("px-5 py-5 sm:px-6", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 rounded-b-card border-t border-line bg-surface-2 px-5 py-3 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
