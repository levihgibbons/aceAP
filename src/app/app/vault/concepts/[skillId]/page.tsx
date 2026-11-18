/**
 * /app/vault/concepts/[skillId] — the bridge between the student's notes and
 * their mastery record for one curriculum concept. Only the student's own
 * records are shown; evidence is summarised (never question content).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Dumbbell,
  FileText,
  Globe2,
  Plus,
  Target,
} from "lucide-react";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  KeyValue,
  MasteryBadge,
  PageHeader,
  Section,
  formatDate,
  formatRelativeTime,
} from "@/components/ui";
import { Sparkline } from "@/components/vault/Sparkline";
import { VaultNav } from "@/components/vault/VaultNav";
import { newNoteHref } from "@/components/vault/wiki";
import { DomainError } from "@/lib/errors";
import { requireStudent } from "@/modules/auth/session";
import { LEVEL_LABEL } from "@/modules/mastery/types";
import { getConceptPage, type ConceptPage, type SkillRef } from "@/modules/vault/service";

type Params = Promise<{ skillId: string }>;

const load = cache(async function load(skillId: string): Promise<ConceptPage> {
  const user = await requireStudent();
  try {
    return await getConceptPage(user, decodeURIComponent(skillId));
  } catch (e) {
    if (e instanceof DomainError && e.code === "not_found") notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { skillId } = await params;
  const page = await load(skillId);
  return { title: page.skill.name };
}

const MISCONCEPTION_STATUS: Record<
  string,
  { label: string; tone: "warn" | "info" | "good" | "neutral" }
> = {
  hypothesis: { label: "Possible — seen in your answers", tone: "warn" },
  teacher_confirmed: { label: "Confirmed by your teacher", tone: "warn" },
  potentially_resolved: { label: "Probably resolved — keep checking", tone: "info" },
  resolved: { label: "Resolved", tone: "good" },
};

const RELATION_LABEL: Record<string, { outgoing: string; incoming: string }> = {
  RELATED_TO: { outgoing: "Related to", incoming: "Related to" },
  APPLIED_IN: { outgoing: "Applied in", incoming: "Applies" },
  EXPLAINS: { outgoing: "Explains", incoming: "Explained by" },
};

function SkillList({ items, empty }: { items: SkillRef[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((s) => (
        <li key={s.skillId} className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={s.href}
            className="min-w-0 text-sm font-medium text-ink hover:underline underline-offset-4"
          >
            {s.name}
          </Link>
          <MasteryBadge level={s.level} size="sm" />
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default async function ConceptPageView({ params }: { params: Params }) {
  const { skillId } = await params;
  const page = await load(skillId);
  const { skill, mastery, evidenceSummary: ev } = page;
  const practiceHref = `/app/practice/${encodeURIComponent(skill.id)}`;
  const crossCourse = page.related.filter((r) => r.crossCourse);
  const sameCourse = page.related.filter((r) => !r.crossCourse);
  const activeMisconceptions = page.misconceptions.filter((m) => m.status !== "resolved");

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Knowledge vault", href: "/app/vault" },
          { label: skill.courseName, href: `/app/courses/${encodeURIComponent(skill.courseId)}` },
          { label: skill.name },
        ]}
        eyebrow={`Concept · ${skill.courseName}`}
        title={skill.name}
        description={skill.description}
        actions={
          <>
            <ButtonLink
              href={newNoteHref(`Notes on ${skill.name}`, `[[${skill.name}]]\n\n`)}
              icon={<Plus aria-hidden="true" className="size-4" />}
            >
              New note about this concept
            </ButtonLink>
            <ButtonLink
              href={practiceHref}
              variant="secondary"
              icon={<Dumbbell aria-hidden="true" className="size-4" />}
            >
              Practice
            </ButtonLink>
          </>
        }
      />
      <VaultNav current="notes" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {/* Mastery */}
          <Card padded={false} as="section" aria-labelledby="mastery-title">
            <CardHeader
              titleAs="h2"
              titleId="mastery-title"
              title="Where you are"
              action={
                <Link
                  href={`/app/skills/${encodeURIComponent(skill.id)}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline underline-offset-4"
                >
                  Skill details <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              }
            />
            <CardBody className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <MasteryBadge level={mastery.level} needsReview={mastery.needsReview} />
                {mastery.lastEvidenceAt ? (
                  <span className="text-sm text-muted">
                    Last evidence {formatRelativeTime(mastery.lastEvidenceAt)}
                  </span>
                ) : null}
              </div>
              <p className="text-[0.9375rem] leading-relaxed text-ink-2">{mastery.summary}</p>
              {mastery.nextLevel ? (
                <div className="rounded-lg border border-line bg-surface-2 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Target aria-hidden="true" className="size-4 text-accent" />
                    To reach {LEVEL_LABEL[mastery.nextLevel]}
                  </p>
                  {mastery.unmet.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
                      {mastery.unmet.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-muted">
                      Keep practising — more independent evidence moves you up.
                    </p>
                  )}
                </div>
              ) : null}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">History</h3>
                <Sparkline
                  points={page.history.map((h) => ({ at: h.at, estimate: h.estimate }))}
                  label={`Evidence history for ${skill.name}`}
                />
              </div>
            </CardBody>
          </Card>

          {/* Evidence */}
          <Section
            title="Evidence summary"
            description="Counts from your answers on this concept. Assisted means a hint, solution, tutor or second try was used."
          >
            {ev.attempts === 0 ? (
              <EmptyState
                icon={<Target />}
                title="No evidence yet"
                description="Answer a few questions on this concept to start your record."
                action={<ButtonLink href={practiceHref}>Start practice</ButtonLink>}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Answers" value={ev.attempts} hint={`${ev.correct} correct`} />
                <Stat
                  label="On your own"
                  value={ev.independentAttempts}
                  hint={`${ev.independentCorrect} correct`}
                />
                <Stat label="Assisted" value={ev.assistedAttempts} />
                <Stat
                  label="Recent accuracy"
                  value={
                    ev.recentIndependentAccuracy === null
                      ? "—"
                      : `${Math.round(ev.recentIndependentAccuracy * 100)}%`
                  }
                  hint={`last ${ev.recentWindow} on your own`}
                />
              </div>
            )}
            {ev.lastDemonstratedAt ? (
              <p className="mt-3 text-sm text-muted">
                Last shown on your own: {formatDate(ev.lastDemonstratedAt)}
              </p>
            ) : null}
          </Section>

          {/* Misconceptions */}
          <Section
            id="misconceptions"
            title="Misconceptions"
            description="Patterns noticed in your answers, with how to fix them."
          >
            {page.misconceptions.length === 0 ? (
              <p className="text-sm text-muted">None noticed on this concept.</p>
            ) : (
              <ul className="space-y-3">
                {page.misconceptions.map((m) => {
                  const st = MISCONCEPTION_STATUS[m.status] ?? {
                    label: m.status,
                    tone: "neutral" as const,
                  };
                  return (
                    <li key={m.id}>
                      <Card>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
                            <AlertTriangle aria-hidden="true" className="size-4 text-m-review" />
                            {m.title}
                          </h3>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-ink-2">{m.description}</p>
                        <div className="mt-3 rounded-lg bg-accent-soft/60 p-3 text-sm leading-relaxed text-ink-2">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-ink">
                            How to fix it
                          </p>
                          {m.remediation}
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          Seen {m.occurrences} {m.occurrences === 1 ? "time" : "times"} · last{" "}
                          {formatRelativeTime(m.lastObservedAt)}
                        </p>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {/* Lessons */}
          <Section title="Lessons that teach it">
            {page.lessons.length === 0 ? (
              <p className="text-sm text-muted">No published lesson covers this concept yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {page.lessons.map((l) => (
                  <li key={l.id}>
                    <Card interactive className="h-full">
                      <Link
                        href={l.href}
                        className="font-medium text-ink after:absolute after:inset-0 hover:underline underline-offset-4"
                      >
                        <BookOpen aria-hidden="true" className="mr-1.5 inline size-4 text-muted" />
                        {l.title}
                      </Link>
                      {l.summary ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{l.summary}</p>
                      ) : null}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Related */}
          <Section
            title="Connected concepts"
            description="How this concept relates to others — including in other courses."
          >
            {page.related.length === 0 ? (
              <p className="text-sm text-muted">No related concepts recorded.</p>
            ) : (
              <div className="space-y-5">
                {[
                  {
                    title: "In other courses",
                    items: crossCourse,
                    icon: <Globe2 aria-hidden="true" className="size-4 text-muted" />,
                  },
                  { title: `In ${skill.courseName}`, items: sameCourse, icon: null },
                ]
                  .filter((g) => g.items.length)
                  .map((g) => (
                    <div key={g.title}>
                      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                        {g.icon}
                        {g.title}
                      </h3>
                      <ul className="space-y-3">
                        {g.items.map((r) => (
                          <li
                            key={`${r.skillId}-${r.type}-${r.direction}`}
                            className="rounded-lg border border-line bg-surface p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm">
                                <span className="text-muted">
                                  {RELATION_LABEL[r.type]?.[r.direction] ?? r.type}{" "}
                                </span>
                                <Link
                                  href={r.href}
                                  className="font-medium text-ink hover:underline underline-offset-4"
                                >
                                  {r.name}
                                </Link>
                                {r.crossCourse ? (
                                  <span className="text-muted"> · {r.courseName}</span>
                                ) : null}
                              </p>
                              <MasteryBadge level={r.level} size="sm" />
                            </div>
                            {r.rationale ? (
                              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                                {r.rationale}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </Section>
        </div>

        <div className="min-w-0 space-y-4">
          <Card padded={false} as="section" aria-labelledby="notes-title">
            <CardHeader
              titleAs="h2"
              titleId="notes-title"
              title="Your notes"
              description={
                page.backlinks.length ? `${page.backlinks.length} linking here` : undefined
              }
            />
            <CardBody>
              {page.backlinks.length === 0 ? (
                <div className="space-y-3 text-sm text-muted">
                  <p>None of your notes link here yet.</p>
                  <ButtonLink
                    href={newNoteHref(`Notes on ${skill.name}`, `[[${skill.name}]]\n\n`)}
                    size="sm"
                    variant="secondary"
                    icon={<Plus aria-hidden="true" className="size-4" />}
                  >
                    Write one
                  </ButtonLink>
                </div>
              ) : (
                <ul className="space-y-3">
                  {page.backlinks.map((b) => (
                    <li key={b.noteId}>
                      <Link
                        href={b.href}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline underline-offset-4"
                      >
                        <FileText aria-hidden="true" className="size-3.5 text-muted" />
                        {b.title}
                      </Link>
                      <p className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-muted">
                        {b.snippet}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card padded={false} as="section" aria-labelledby="prereq-title">
            <CardHeader
              titleAs="h2"
              titleId="prereq-title"
              title="Builds on"
              description="Prerequisites"
            />
            <CardBody>
              <SkillList items={page.prerequisites} empty="No prerequisites — a starting point." />
            </CardBody>
          </Card>
          <Card padded={false} as="section" aria-labelledby="dependents-title">
            <CardHeader
              titleAs="h2"
              titleId="dependents-title"
              title="Leads to"
              description="Concepts that build on this one"
            />
            <CardBody>
              <SkillList items={page.dependents} empty="Nothing builds on this yet." />
            </CardBody>
          </Card>
          {activeMisconceptions.length ? (
            <KeyValue
              className="rounded-card border border-line bg-surface p-4 shadow-card"
              items={[{ label: "Open misconceptions", value: activeMisconceptions.length }]}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
