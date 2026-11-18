import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import {
  ButtonLink,
  Card,
  EmptyState,
  MasteryBadge,
  PageHeader,
  ProgressBar,
  Section,
  pluralize,
} from "@/components/ui";
import { ContentStatusBadge, MiniLabel } from "@/components/student/Bits";
import { pct } from "@/components/student/format";
import { ReadinessDisclaimer } from "@/components/student/ReadinessDisclaimer";
import { requireStudent } from "@/modules/auth/session";
import { getCatalog } from "@/modules/curriculum/queries";
import {
  READINESS_DISCLAIMER,
  getExamReadiness,
  type ExamReadiness,
} from "@/modules/examprep/service";
import { getEnrolledCourses } from "@/modules/learning/overview";

export const metadata: Metadata = { title: "Exam prep" };

export default async function ExamPrepIndexPage() {
  const user = await requireStudent();
  const actor = { id: user.id, role: user.role };
  const [enrolled, catalog] = [await getEnrolledCourses(actor, user.id), await getCatalog()];
  const withLessons = new Set(catalog.filter((c) => c.lessonCount > 0).map((c) => c.id));

  const mine: ExamReadiness[] = [];
  for (const c of enrolled.filter((e) => withLessons.has(e.courseId)))
    mine.push(await getExamReadiness(actor, user.id, c.courseId));
  const mineIds = new Set(mine.map((m) => m.courseId));
  const others = catalog.filter((c) => withLessons.has(c.id) && !mineIds.has(c.id));
  const enrolledWithout = enrolled.filter((e) => !withLessons.has(e.courseId));

  return (
    <>
      <PageHeader
        title="AP exam preparation"
        description="See where your practice evidence is strong, where it's thin, and what to review next — unit by unit."
      />
      <ReadinessDisclaimer text={READINESS_DISCLAIMER} />

      <Section title="My courses" id="mine">
        {mine.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {mine.map((r) => {
              const available = r.perUnit.filter((u) => u.status === "available");
              return (
                <li key={r.courseId}>
                  <Card interactive className="h-full">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-[1.0625rem] font-semibold text-ink">
                        <Link
                          href={`/app/exam-prep/${r.courseId}`}
                          className="after:absolute after:inset-0 after:rounded-card hover:underline underline-offset-4"
                        >
                          {r.courseName}
                        </Link>
                      </h3>
                      <ContentStatusBadge status={r.courseStatus} className="shrink-0" />
                    </div>
                    <div className="mt-4 space-y-4">
                      <div>
                        <MiniLabel>Evidence coverage</MiniLabel>
                        <ProgressBar
                          value={r.coverage}
                          label={`${r.courseName} evidence coverage`}
                          tone="info"
                          size="sm"
                        />
                        <p className="mt-1.5 text-xs text-muted">
                          Evidence on{" "}
                          <span className="font-medium text-ink-2">
                            {r.skillsWithEvidence} of {r.totalSkills}
                          </span>{" "}
                          skills ({pct(r.coverage)}) · {Math.round(r.masteryShare * r.totalSkills)}{" "}
                          Proficient or better
                        </p>
                      </div>
                      <ul aria-label="Units" className="space-y-1.5">
                        {available.map((u) => (
                          <li
                            key={u.unitId}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="min-w-0 truncate text-ink-2">
                              Unit {u.number}: {u.title}
                            </span>
                            <MasteryBadge level={u.level} size="sm" />
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted">
                        {pluralize(r.weakestObjectives.length, "objective")} to strengthen ·{" "}
                        {pluralize(r.untested.length, "objective")} with no evidence yet ·{" "}
                        {pluralize(r.practiceResults.attempts.length, "practice set")} taken
                      </p>
                    </div>
                    <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                      Open exam prep <ArrowRight aria-hidden="true" className="size-3.5" />
                    </p>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<Target />}
            title="No exam prep to show yet"
            description={
              enrolledWithout.length
                ? `AceAP doesn't have lessons for ${enrolledWithout.map((e) => e.name).join(", ")} yet, so there's no practice evidence to summarise.`
                : "Join a class or add a course with lessons. Exam prep summarises your practice once you start answering questions."
            }
            action={
              <ButtonLink href="/app/courses?lessons=1" variant="secondary">
                Courses with lessons
              </ButtonLink>
            }
          />
        )}
      </Section>

      {others.length ? (
        <Section
          title="Other courses with exam practice"
          id="others"
          description="You can look at exam prep for any course with lessons, even if it isn't in your courses."
        >
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/exam-prep/${c.id}`}
                  className="group flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card hover:border-line-strong"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{c.name}</span>
                    <span className="block text-xs text-muted">
                      {pluralize(c.lessonCount, "lesson")}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-faint group-hover:text-ink-2"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
