/**
 * /app/vault — "My knowledge": the student's personal knowledge base, built
 * automatically from their progress (lessons reached, mastery, misconceptions
 * found and fixed, notes they linked). Nothing to set up; it fills in as they
 * learn. Their own notes live under /app/vault/notes.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  FileText,
  Lightbulb,
  Lock,
  Plus,
  Sigma,
  Sparkles,
  Target,
} from "lucide-react";
import { InlineMarkdown, Markdown } from "@/components/content/Markdown";
import {
  ButtonLink,
  EmptyState,
  MasteryBadge,
  PageHeader,
  StatTile,
  TabLinks,
  formatRelativeTime,
  pluralize,
} from "@/components/ui";
import { VaultNav } from "@/components/vault/VaultNav";
import { newNoteHref } from "@/components/vault/wiki";
import { cn } from "@/lib/cn";
import { requireStudent } from "@/modules/auth/session";
import { getKnowledgeBase, type KnowledgeBase, type KnowledgeTopic } from "@/modules/vault/knowledge";

export const metadata: Metadata = { title: "Knowledge vault" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const RECENT_ICON: Record<KnowledgeBase["recent"][number]["kind"], typeof BookOpen> = {
  lesson_completed: CheckCircle2,
  lesson_started: BookOpen,
  skill: Target,
  fixed: Sparkles,
};

export default async function KnowledgePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  // Old note links (/app/vault?note=…, ?q=, ?tag=, ?folder=) now live under Notes.
  const legacy = new URLSearchParams();
  for (const k of ["note", "q", "tag", "folder"]) {
    const v = one(sp[k]);
    if (v !== undefined) legacy.set(k, v);
  }
  if ([...legacy.keys()].length) redirect(`/app/vault/notes?${legacy.toString()}`);

  const user = await requireStudent();
  const kb = await getKnowledgeBase(user);
  const withContent = kb.courses.filter((c) => c.totals.topics > 0);
  const courseParam = one(sp.course);
  const course = withContent.find((c) => c.courseId === courseParam) ?? withContent[0] ?? null;
  const t = course?.totals;
  // The topic the student touched most recently starts open.
  const openTopicId = course
    ? course.units
        .flatMap((u) => u.topics)
        .reduce<KnowledgeTopic | null>((m, x) => ((x.lastActivityAt?.getTime() ?? 0) > (m?.lastActivityAt?.getTime() ?? -1) ? x : m), null)?.id
    : undefined;
  const watchOut = course ? course.units.flatMap((u) => u.topics.flatMap((x) => x.watchOut.map((w) => ({ ...w, topic: x.title })))) : [];

  return (
    <>
      <PageHeader
        title="Knowledge vault"
        description="Everything you've learned, collected as you go. It fills in by itself as you work through lessons and practice, and only you can see it."
        actions={
          <ButtonLink href="/app/vault/new" variant="secondary" icon={<Plus aria-hidden="true" className="size-4" />}>
            New note
          </ButtonLink>
        }
      />
      <VaultNav current="knowledge" />

      {!course ? (
        <EmptyState
          icon={<Sparkles />}
          title="Your vault fills itself in"
          description="Start a lesson and the key ideas, definitions and formulas you meet land here, next to how you're doing on each skill. Mistakes your answers show, and the ones you fix, appear too."
          action={<ButtonLink href="/app/courses">Go to my courses</ButtonLink>}
        />
      ) : (
        <>
          {withContent.length > 1 ? (
            <TabLinks
              className="mb-6"
              label="Courses in your vault"
              current={course.courseId}
              items={withContent.map((c) => ({ id: c.courseId, label: c.name, href: `/app/vault?course=${encodeURIComponent(c.courseId)}` }))}
            />
          ) : null}

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Topics in your vault" value={t!.topics} hint={course.name} icon={<BookOpen />} />
            <StatTile label="Ideas and formulas" value={t!.keyIdeas + t!.definitions + t!.formulas} hint={`${pluralize(t!.definitions, "definition")} · ${pluralize(t!.formulas, "formula")}`} icon={<Lightbulb />} />
            <StatTile label="Skills secure" value={`${t!.skillsSecure} / ${t!.skillsStarted}`} hint="Proficient or mastered, of skills started" icon={<Target />} />
            <StatTile
              label="Mistakes fixed"
              value={t!.fixedMisconceptions}
              hint={t!.watchOut ? `${pluralize(t!.watchOut, "one")} still to watch` : "Nothing to watch right now"}
              icon={<Sparkles />}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-10">
              {course.units.map((unit) => (
                <section key={unit.id} aria-labelledby={`unit-${unit.id}`}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 id={`unit-${unit.id}`} className="font-display text-xl font-semibold text-ink">
                      Unit {unit.number}: {unit.title}
                    </h2>
                    <p className="text-sm text-muted">
                      {unit.topics.length} of {unit.topics.length + unit.lockedTopics} topics unlocked
                    </p>
                  </div>
                  <ul className="space-y-3">
                    {unit.topics.map((topic) => (
                      <li key={topic.id}>
                        <TopicCard topic={topic} open={topic.id === openTopicId} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              {course.upcomingUnits.length ? (
                <section aria-labelledby="upcoming-units" className="rounded-card border border-dashed border-line-strong px-5 py-4">
                  <h2 id="upcoming-units" className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Lock aria-hidden="true" className="size-4 text-faint" /> Still to unlock
                  </h2>
                  <p className="mt-1 text-sm text-muted">These units join your vault when you start their first lesson.</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {course.upcomingUnits.map((u) => (
                      <li key={u.id}>
                        <Link href={u.href} className="inline-flex items-center rounded-md border border-line bg-surface px-2.5 py-1 text-sm text-ink-2 hover:border-line-strong hover:text-ink">
                          Unit {u.number}: {u.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <aside className="space-y-6" aria-label="Vault activity">
              <section aria-labelledby="recent-title" className="rounded-card border border-line bg-surface p-5 shadow-card">
                <h2 id="recent-title" className="text-sm font-semibold text-ink">
                  Recently added
                </h2>
                {kb.recent.length ? (
                  <ol className="mt-3 space-y-3">
                    {kb.recent.map((r, i) => {
                      const Icon = RECENT_ICON[r.kind];
                      return (
                        <li key={`${r.kind}-${r.href}-${i}`} className="flex gap-2.5 text-sm">
                          <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", r.kind === "fixed" ? "text-good" : r.kind === "skill" ? "text-accent" : "text-faint")} />
                          <div className="min-w-0">
                            <Link href={r.href} className="font-medium text-ink underline-offset-4 hover:underline">
                              {r.label}
                            </Link>
                            <p className="text-xs text-muted">
                              {r.detail} · {formatRelativeTime(r.at)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="mt-2 text-sm text-muted">Nothing yet.</p>
                )}
              </section>

              {watchOut.length ? (
                <section aria-labelledby="watch-title" className="rounded-card border border-warn/30 bg-warn-soft p-5">
                  <h2 id="watch-title" className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <AlertTriangle aria-hidden="true" className="size-4 text-warn" /> Watch out for
                  </h2>
                  <p className="mt-1 text-xs text-ink-2">Mistakes your answers have shown. They clear once you get these questions right on your own.</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {watchOut.slice(0, 6).map((w) => (
                      <li key={w.id}>
                        <Link href={`/app/vault/concepts/${encodeURIComponent(w.skillId)}`} className="font-medium text-ink underline-offset-4 hover:underline">
                          {w.title}
                        </Link>
                        <span className="block text-xs text-muted">{w.topic}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section aria-labelledby="how-title" className="rounded-card border border-line bg-surface-2 p-5 text-sm text-ink-2">
                <h2 id="how-title" className="font-semibold text-ink">
                  How your vault grows
                </h2>
                <ul className="mt-2 space-y-1.5">
                  <li>Lessons add their key ideas, definitions and formulas as you reach them.</li>
                  <li>Practice updates each skill&apos;s level.</li>
                  <li>
                    Your own{" "}
                    <Link href="/app/vault/notes" className="font-medium text-accent underline-offset-4 hover:underline">
                      notes
                    </Link>{" "}
                    appear under the topics they link to.
                  </li>
                </ul>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  );
}

function TopicCard({ topic, open }: { topic: KnowledgeTopic; open: boolean }) {
  const items = topic.keyIdeas.length + topic.definitions.length + topic.formulas.length;
  const noteLinks = topic.skills.slice(0, 3).map((s) => `[[${s.name}]]`).join(" · ");
  return (
    <details open={open} className="group rounded-card border border-line bg-surface shadow-card">
      <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4 hover:bg-surface-2 sm:px-6 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium leading-snug text-ink">{topic.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {pluralize(items, "item")} · {pluralize(topic.lessons.filter((l) => l.status === "completed").length, "lesson")} finished
            {topic.watchOut.length ? ` · ${pluralize(topic.watchOut.length, "thing")} to watch` : ""}
            {topic.lastActivityAt ? ` · ${formatRelativeTime(topic.lastActivityAt)}` : ""}
          </p>
          {topic.skills.length ? (
            // A glance at skill levels; the full, labelled list is inside the card.
            <span aria-hidden="true" className="mt-2 flex flex-wrap gap-1.5">
              {topic.skills.map((s) => (
                <span key={s.id} title={`${s.name}: ${s.levelLabel}`}>
                  <MasteryBadge level={s.level} needsReview={s.needsReview} size="sm" showLabel={false} />
                </span>
              ))}
            </span>
          ) : null}
        </div>
        <ChevronDown aria-hidden="true" className="mt-1 size-4 shrink-0 text-faint transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-6 border-t border-line px-5 py-5 sm:px-6">
        {topic.lessons.length ? (
          <ul className="flex flex-wrap gap-2" aria-label="Lessons">
            {topic.lessons.map((l) => (
              <li key={l.id}>
                <Link
                  href={l.href}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2 hover:border-line-strong hover:text-ink"
                >
                  {l.status === "completed" ? <CheckCircle2 aria-hidden="true" className="size-3.5 text-good" /> : <CircleDot aria-hidden="true" className="size-3.5 text-accent" />}
                  <span className="tabular-nums text-muted">{l.number}</span> {l.title}
                  <span className="sr-only">{l.status === "completed" ? "(finished)" : "(in progress)"}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {topic.keyIdeas.length ? (
          <Block icon={<Lightbulb />} title="Key ideas">
            <ul className="list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed text-ink-2 marker:text-faint">
              {topic.keyIdeas.map((k) => (
                <li key={k.text}>
                  <InlineMarkdown>{k.text}</InlineMarkdown>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {topic.definitions.length ? (
          <Block icon={<BookOpen />} title="Definitions">
            <dl className="grid gap-3 sm:grid-cols-2">
              {topic.definitions.map((d) => (
                <div key={d.term} className="rounded-lg border border-line bg-surface-2 px-3.5 py-3">
                  <dt className="font-medium text-ink">
                    <InlineMarkdown>{d.term}</InlineMarkdown>
                  </dt>
                  <dd className="mt-1 text-sm text-ink-2">
                    <Markdown compact>{d.md}</Markdown>
                  </dd>
                </div>
              ))}
            </dl>
          </Block>
        ) : null}

        {topic.formulas.length ? (
          <Block icon={<Sigma />} title="Formulas">
            <ul className="grid gap-3 sm:grid-cols-2">
              {topic.formulas.map((f) => (
                <li key={f.latex} className="rounded-lg border border-line bg-surface-2 px-3.5 py-2">
                  <div className="overflow-x-auto">
                    <Markdown compact>{`$$\n${f.latex}\n$$`}</Markdown>
                  </div>
                  {f.caption ? <p className="text-center text-xs text-muted">{f.caption}</p> : null}
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {topic.skills.length ? (
          <Block icon={<Target />} title="Your skills">
            <ul className="divide-y divide-line rounded-lg border border-line">
              {topic.skills.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                  <Link href={s.href} className="min-w-0 text-sm font-medium text-ink underline-offset-4 hover:underline">
                    {s.name}
                  </Link>
                  <MasteryBadge level={s.level} needsReview={s.needsReview} size="sm" />
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {topic.watchOut.length || topic.fixed.length ? (
          <Block icon={<AlertTriangle />} title="Mistakes">
            <ul className="space-y-2 text-sm">
              {topic.watchOut.map((w) => (
                <li key={w.id} className="rounded-lg border border-warn/30 bg-warn-soft px-3.5 py-2.5">
                  <p className="font-medium text-ink">Watch out: {w.title}</p>
                  <div className="mt-0.5 text-ink-2">
                    <Markdown compact>{w.remediation}</Markdown>
                  </div>
                </li>
              ))}
              {topic.fixed.map((f) => (
                <li key={f.id} className="flex items-center gap-2 text-ink-2">
                  <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-good" />
                  <span>
                    Fixed: <span className="font-medium text-ink">{f.title}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        <Block icon={<FileText />} title="Your notes">
          {topic.notes.length ? (
            <ul className="mb-2 space-y-1 text-sm">
              {topic.notes.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} className="font-medium text-accent underline-offset-4 hover:underline">
                    {n.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            href={newNoteHref(`Notes on ${topic.title}`, noteLinks ? `${noteLinks}\n\n` : undefined)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add a note on this topic
          </Link>
        </Block>
      </div>
    </details>
  );
}

function Block({ icon, title, children }: { icon: React.ReactElement; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.07em] text-muted">
        <span aria-hidden="true" className="[&>svg]:size-3.5">
          {icon}
        </span>
        {title}
      </h4>
      {children}
    </section>
  );
}
