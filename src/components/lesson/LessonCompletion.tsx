"use client";
/**
 * End of a lesson: practice for this topic first (it's what moves mastery),
 * then "Mark lesson complete" and the next lesson. Completing a lesson never
 * changes mastery — only answered questions do.
 */
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardCheck, Dumbbell } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";
import { apiFetch } from "@/lib/api";

export interface PracticeLink {
  href: string;
  title: string;
  meta: string;
  kind: "exercise" | "quiz" | "skill";
}

export interface LessonNextSteps {
  nextLesson: { href: string; title: string } | null;
  practice: PracticeLink[];
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
    <div className="space-y-4">
      {next.practice.length ? (
        <section aria-labelledby="lesson-practice-title" className="rounded-card border border-accent/30 bg-accent-soft/40 p-5 sm:p-6">
          <h2 id="lesson-practice-title" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Dumbbell aria-hidden="true" className="size-5 text-accent" />
            Now practise it
          </h2>
          <p className="mt-1 text-sm text-muted">Reading doesn&apos;t change your skill level. Answering questions does.</p>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {next.practice.map((p, i) => (
              <li key={p.href}>
                <Link href={p.href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                  {p.kind === "quiz" ? (
                    <ClipboardCheck aria-hidden="true" className="size-[1.125rem] shrink-0 text-muted" />
                  ) : (
                    <Dumbbell aria-hidden="true" className="size-[1.125rem] shrink-0 text-accent" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink underline-offset-4 group-hover:underline">{p.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">{p.meta}</span>
                  </span>
                  <span className={i === 0 ? "text-sm font-semibold text-accent" : "text-xs font-medium text-accent"}>
                    Start <ArrowRight aria-hidden="true" className="inline size-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="lesson-complete-title" className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
        {completed ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" role={justCompleted ? "status" : undefined}>
            <h2 id="lesson-complete-title" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-good" />
              {justCompleted ? "Lesson complete — nice work" : "You've completed this lesson"}
            </h2>
            {next.nextLesson ? (
              <ButtonLink href={next.nextLesson.href} variant="secondary" iconRight={<ArrowRight aria-hidden="true" className="size-4" />}>
                <span className="sr-only">Next lesson: </span>
                {next.nextLesson.title}
              </ButtonLink>
            ) : (
              <ButtonLink href={next.courseHref} variant="secondary">
                Back to the course
              </ButtonLink>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="lesson-complete-title" className="font-display text-lg font-semibold text-ink">
                Finished reading?
              </h2>
              <p className="mt-0.5 text-xs text-muted">This doesn&apos;t change your mastery — only answered questions do.</p>
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
      </section>
    </div>
  );
}
