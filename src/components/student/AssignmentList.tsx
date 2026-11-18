/**
 * Assignment rows for the home page and the assignments list.
 * Due dates show both relative and absolute time; late work is flagged in text.
 */
import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { StudentAssignment } from "@/modules/learning/overview";
import { dueInfo, scoreText } from "./format";

const KIND_LABEL: Record<StudentAssignment["kind"], string> = {
  lesson: "Lesson",
  skill_practice: "Skill practice",
  assessment: "Quiz or test",
};

export function AssignmentList({
  assignments,
  now,
  compact = false,
  showClass = true,
  label,
}: {
  assignments: StudentAssignment[];
  now: Date;
  compact?: boolean;
  showClass?: boolean;
  label: string;
}) {
  return (
    <ul aria-label={label} className="divide-y divide-line">
      {assignments.map((a) => {
        const due = dueInfo(a.dueAt, now);
        const score = scoreText(a.bestScore, a.maxScore);
        const attempts = a.maxAttempts
          ? `${a.submissions} of ${a.maxAttempts} attempts used`
          : `${a.submissions} ${a.submissions === 1 ? "attempt" : "attempts"}`;
        return (
          <li key={a.id}>
            <Link
              href={a.href}
              className={cn(
                "group flex items-start gap-3 rounded-lg px-1 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                compact ? "py-3" : "py-4",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink group-hover:underline group-hover:underline-offset-4">
                  {a.title}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {showClass ? <>{a.className} · </> : null}
                  {KIND_LABEL[a.kind]}
                  {!compact ? <> · {attempts}</> : null}
                  {!compact && score ? <> · Best score {score}</> : null}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {a.done ? (
                    <Badge tone="good">Submitted</Badge>
                  ) : (
                    <Badge tone={due.tone} icon={<Clock className="size-3" />}>
                      {due.overdue ? "Past due" : due.label}
                    </Badge>
                  )}
                  {a.late ? <Badge tone="warn">Submitted late</Badge> : null}
                  {due.absolute ? (
                    <span className="text-xs text-muted">
                      {due.overdue || a.done ? due.label : "Due"}{" "}
                      {due.overdue || a.done ? `(${due.absolute})` : due.absolute}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">No due date</span>
                  )}
                </div>
              </div>
              <ChevronRight
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-faint group-hover:text-ink-2"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
