"use client";
/**
 * End-of-lesson control: "Mark lesson complete", then what's next. Says
 * plainly that completing a lesson doesn't change mastery — only answered
 * questions do.
 */
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, Dumbbell, Info } from "lucide-react";
import { Button, MasteryBadge } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { MasteryLevel } from "@/modules/mastery/types";

export interface LessonNextSteps {
  nextLesson: { href: string; title: string } | null;
  practice: { href: string; skillName: string; level: MasteryLevel; needsReview: boolean }[];
  quiz: { href: string; title: string } | null;
  courseHref: string;
}

export function LessonCompletion({ lessonId, initiallyCompleted, next }: { lessonId: string; initiallyCompleted: boolean; next: LessonNextSteps }) {
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [justCompleted, setJustCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/lessons/${encodeURIComponent(lessonId)}/complete`, { method: "POST" });
      setCompleted(true);
      setJustCompleted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't mark the lesson complete. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="lesson-complete-title" className="rounded-card border border-line bg-surface shadow-card">
      <div className="p-5 sm:p-6">
        {completed ? (
          <div className="flex items-start gap-3" role={justCompleted ? "status" : undefined}>
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-good" />
            <div>
              <h2 id="lesson-complete-title" className="font-display text-lg font-semibold text-ink">
                {justCompleted ? "Lesson complete — nice work" : "You've completed this lesson"}
              </h2>
              <p className="mt-1 text-sm text-muted">Completing a lesson doesn&apos;t change your mastery — only answered questions do. Practice is how your skills move.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="lesson-complete-title" className="font-display text-lg font-semibold text-ink">
                Finished working through it?
              </h2>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                Marking it complete records that you reached the end. It doesn&apos;t change your mastery — only answered questions do.
              </p>
            </div>
            <Button onClick={complete} loading={busy} loadingText="Saving…" icon={<CheckCircle2 aria-hidden="true" className="size-4" />}>
              Mark lesson complete
            </Button>
          </div>
        )}
        {error ? (
          <p role="alert" className="mt-3 text-sm font-medium text-bad">
            {error}
          </p>
        ) : null}
      </div>

      {completed ? (
        <div className="border-t border-line px-5 py-5 sm:px-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">What&apos;s next</h3>
          <ul className="mt-3 divide-y divide-line">
            {next.practice.map((p) => (
              <li key={p.href} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <div className="flex min-w-0 items-start gap-2.5">
                  <Dumbbell aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">Practice: {p.skillName}</p>
                    <div className="mt-1">
                      <MasteryBadge level={p.level} needsReview={p.needsReview} size="sm" />
                    </div>
                  </div>
                </div>
                <Link href={p.href} className="inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-4 hover:underline">
                  Start practice <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </li>
            ))}
            {next.quiz ? (
              <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <p className="flex min-w-0 items-start gap-2.5 text-sm font-medium text-ink">
                  <ClipboardList aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>Check yourself: {next.quiz.title}</span>
                </p>
                <Link href={next.quiz.href} className="inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-4 hover:underline">
                  See the quiz <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </li>
            ) : null}
            {next.nextLesson ? (
              <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <p className="min-w-0 text-sm text-ink">
                  <span className="text-muted">Next lesson: </span>
                  <span className="font-medium">{next.nextLesson.title}</span>
                </p>
                <Link href={next.nextLesson.href} className="inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-4 hover:underline">
                  Continue <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </li>
            ) : (
              <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <p className="text-sm text-ink">That&apos;s the last lesson in this course for now.</p>
                <Link href={next.courseHref} className="inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-4 hover:underline">
                  Back to the course <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
