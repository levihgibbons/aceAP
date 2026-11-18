"use client";
/**
 * The student's own courses, listed under the student navigation so each one
 * is a single click away (Sidebar and the mobile "More" drawer).
 */
import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortCourseName, type ShellCourse } from "./nav";

function initials(name: string): string {
  const words = shortCourseName(name).split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w));
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

export function CourseLinks({
  courses,
  collapsed = false,
  onNavigate,
}: {
  courses: ShellCourse[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const headingId = useId();
  return (
    <div>
      {!collapsed ? (
        <p id={headingId} className="mb-2 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-faint">
          Your courses
        </p>
      ) : null}
      <ul className="space-y-0.5" aria-labelledby={collapsed ? undefined : headingId} aria-label={collapsed ? "Your courses" : undefined}>
        {courses.map((c) => {
          const href = `/app/courses/${c.id}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={c.id}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? c.name : undefined}
                onClick={onNavigate}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors lg:min-h-10",
                  collapsed && "lg:justify-center lg:px-0",
                  active ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:bg-sunken hover:text-ink",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[0.625rem] font-semibold tracking-tight",
                    active ? "bg-accent text-on-accent" : "bg-sunken text-muted group-hover:text-ink-2",
                  )}
                >
                  {initials(c.name)}
                </span>
                <span className={cn("truncate", collapsed && "lg:sr-only")}>{shortCourseName(c.name)}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/app/courses/browse"
            aria-current={pathname === "/app/courses/browse" ? "page" : undefined}
            title={collapsed ? "Browse all courses" : undefined}
            onClick={onNavigate}
            className={cn(
              "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors lg:min-h-10",
              collapsed && "lg:justify-center lg:px-0",
              pathname === "/app/courses/browse" ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-sunken hover:text-ink",
            )}
          >
            <Compass aria-hidden="true" className="size-[1.1rem] shrink-0 text-faint group-hover:text-ink-2" />
            <span className={cn("truncate", collapsed && "lg:sr-only")}>Browse all courses</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
