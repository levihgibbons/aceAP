/**
 * LessonNav — course → unit → lesson navigation with per-lesson status
 * (icon + text, never colour alone). Server Component.
 */
import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CourseTree } from "@/modules/curriculum/queries";

type LessonStatus = "completed" | "in_progress" | "not_started";

const STATUS_TEXT: Record<LessonStatus, string> = { completed: "Completed", in_progress: "In progress", not_started: "Not started" };

export function LessonNav({
  tree,
  currentLessonId,
  progress,
}: {
  tree: CourseTree;
  currentLessonId: string;
  progress: Map<string, { status: "in_progress" | "completed" }>;
}) {
  const currentUnitId = tree.lessons.get(currentLessonId)?.unitId;
  const units = tree.units.filter((u) => u.topics.some((tp) => tp.lessons.length > 0));
  const completed = tree.lessonOrder.filter((id) => progress.get(id)?.status === "completed").length;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <Link href={`/app/courses/${tree.course.id}`} className="font-display text-[0.9375rem] font-semibold text-ink underline-offset-4 hover:underline">
          {tree.course.name}
        </Link>
        <p className="mt-0.5 text-xs text-muted">
          {completed} of {tree.lessonOrder.length} lessons completed
        </p>
      </div>
      <ul className="space-y-1">
        {units.map((u) => (
          <li key={u.id}>
            <details open={u.id === currentUnitId} className="group">
              <summary className="flex cursor-pointer list-none items-start gap-1.5 rounded-md px-1.5 py-1.5 font-medium text-ink-2 hover:bg-sunken [&::-webkit-details-marker]:hidden">
                <ChevronRight aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-faint transition-transform group-open:rotate-90" />
                <span className="min-w-0">
                  <span className="text-muted">Unit {u.number}</span> · {u.title}
                </span>
              </summary>
              <ul className="mb-2 mt-1 space-y-3 pl-3">
                {u.topics
                  .filter((tp) => tp.lessons.length > 0)
                  .map((tp) => (
                    <li key={tp.id}>
                      <p className="mb-1 px-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-faint">{tp.title}</p>
                      <ul className="space-y-0.5">
                        {tp.lessons.map((l) => {
                          const status: LessonStatus = progress.get(l.id)?.status ?? "not_started";
                          const current = l.id === currentLessonId;
                          const Icon = status === "completed" ? CheckCircle2 : status === "in_progress" ? CircleDot : Circle;
                          const body = (
                            <>
                              <Icon
                                aria-hidden="true"
                                className={cn("mt-0.5 size-4 shrink-0", status === "completed" ? "text-good" : status === "in_progress" ? "text-accent" : "text-faint")}
                              />
                              <span className="min-w-0 flex-1 leading-snug">
                                {l.title}
                                <span className="sr-only">
                                  {" "}
                                  — {STATUS_TEXT[status]}
                                  {current ? ", current lesson" : ""}
                                </span>
                              </span>
                            </>
                          );
                          return (
                            <li key={l.id}>
                              {l.publishedVersion ? (
                                <Link
                                  href={`/app/learn/${l.id}`}
                                  aria-current={current ? "page" : undefined}
                                  className={cn(
                                    "flex items-start gap-2 rounded-md px-1.5 py-1.5 transition-colors",
                                    current ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-2 hover:bg-sunken hover:text-ink",
                                  )}
                                >
                                  {body}
                                </Link>
                              ) : (
                                <span className="flex items-start gap-2 px-1.5 py-1.5 text-faint">
                                  {body}
                                  <span className="text-[0.6875rem]">Coming soon</span>
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
