/**
 * TabLinks — URL-driven tabs (server-friendly). Each tab is a link; the
 * current one gets aria-current="page".
 *   <TabLinks label="Course sections" current={tab}
 *     items={[{ id: "overview", label: "Overview", href: "?tab=overview" },
 *             { id: "skills", label: "Skills", href: "?tab=skills", count: 31 }]} />
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabLinkItem {
  id: string;
  label: ReactNode;
  href: string;
  count?: number;
}

export interface TabLinksProps {
  items: TabLinkItem[];
  current: string;
  /** Accessible name for the navigation. */
  label: string;
  className?: string;
}

export function TabLinks({ items, current, label, className }: TabLinksProps) {
  return (
    <nav aria-label={label} className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <ul className="flex min-w-max gap-1 border-b border-line">
        {items.map((item) => {
          const active = item.id === current;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                scroll={false}
                className={cn(
                  "-mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                  active ? "border-accent text-ink" : "border-transparent text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {item.label}
                {typeof item.count === "number" ? (
                  <span className="rounded-full bg-sunken px-1.5 text-xs tabular-nums text-muted">{item.count}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
