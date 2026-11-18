import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { FileCheck2, Info } from "lucide-react";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  Select,
  formatDate,
  type BadgeTone,
} from "@/components/ui";
import { requireRole } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Content review" };

const PAGE_SIZE = 100;
const ORIGIN_LABEL: Record<string, string> = {
  original: "Original",
  ai_assisted_original: "AI-assisted original",
  licensed: "Licensed",
  teacher_contributed: "Teacher-contributed",
};
const DECISION: Record<string, { label: string; tone: BadgeTone }> = {
  approved: { label: "Approved by reviewer", tone: "good" },
  automated_checks_passed: { label: "Automated checks passed", tone: "info" },
  changes_requested: { label: "Changes requested", tone: "bad" },
};
const STATUS_TONE: Record<string, BadgeTone> = {
  published: "good",
  validated: "info",
  in_review: "warn",
  draft: "neutral",
  retired: "neutral",
};

interface Item {
  type: "lesson" | "question";
  id: string;
  title: string;
  courseId: string;
  version: number;
  status: string;
  origin: string;
  author: string;
  reviewedBy: string | null;
  createdAt: Date;
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("platform_admin");
  const params = await searchParams;
  const db = await getDb();

  const courses = await db
    .select({ id: t.courses.id, name: t.courses.name })
    .from(t.courses)
    .orderBy(asc(t.courses.sortOrder));
  const withContent = new Set([
    ...(await db.selectDistinct({ c: t.lessons.courseId }).from(t.lessons)).map((r) => r.c),
    ...(await db.selectDistinct({ c: t.questions.courseId }).from(t.questions)).map((r) => r.c),
  ]);
  const courseOptions = courses.filter((c) => withContent.has(c.id));
  const course =
    typeof params.course === "string" && courseOptions.some((c) => c.id === params.course)
      ? params.course
      : "";
  const type = params.type === "lesson" || params.type === "question" ? params.type : "";
  const reviewFilter =
    params.review === "pending" || params.review === "approved" ? params.review : "";
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);
  const courseName = new Map(courses.map((c) => [c.id, c.name]));

  // Version rows only — no question bodies, solutions or answer keys are read.
  const lessonRows =
    type !== "question"
      ? await db
          .select({
            id: t.lessons.id,
            title: t.lessons.title,
            courseId: t.lessons.courseId,
            version: t.lessonVersions.version,
            status: t.lessonVersions.status,
            provenance: t.lessonVersions.provenance,
            createdAt: t.lessonVersions.createdAt,
          })
          .from(t.lessonVersions)
          .innerJoin(t.lessons, eq(t.lessons.id, t.lessonVersions.lessonId))
          .where(course ? eq(t.lessons.courseId, course) : undefined)
          .orderBy(asc(t.lessons.courseId), asc(t.lessons.ordinal), desc(t.lessonVersions.version))
      : [];
  const questionRows =
    type !== "lesson"
      ? await db
          .select({
            id: t.questions.id,
            qtype: t.questions.type,
            skill: t.skills.name,
            courseId: t.questions.courseId,
            version: t.questionVersions.version,
            status: t.questionVersions.status,
            provenance: t.questionVersions.provenance,
            createdAt: t.questionVersions.createdAt,
          })
          .from(t.questionVersions)
          .innerJoin(t.questions, eq(t.questions.id, t.questionVersions.questionId))
          .innerJoin(t.skills, eq(t.skills.id, t.questions.primarySkillId))
          .where(course ? eq(t.questions.courseId, course) : undefined)
          .orderBy(asc(t.questions.courseId), asc(t.questions.id), desc(t.questionVersions.version))
      : [];

  const latest = new Map<string, Item>();
  for (const r of lessonRows) {
    const k = `lesson:${r.id}`;
    if (!latest.has(k))
      latest.set(k, {
        type: "lesson",
        id: r.id,
        title: r.title,
        courseId: r.courseId,
        version: r.version,
        status: r.status,
        origin: r.provenance.origin,
        author: r.provenance.author,
        reviewedBy: r.provenance.reviewedBy ?? null,
        createdAt: r.createdAt,
      });
  }
  for (const r of questionRows) {
    const k = `question:${r.id}`;
    if (!latest.has(k))
      latest.set(k, {
        type: "question",
        id: r.id,
        title: `${r.skill} · ${r.qtype.replace(/_/g, " ")}`,
        courseId: r.courseId,
        version: r.version,
        status: r.status,
        origin: r.provenance.origin,
        author: r.provenance.author,
        reviewedBy: r.provenance.reviewedBy ?? null,
        createdAt: r.createdAt,
      });
  }
  const items = [...latest.values()];

  const ids = items.map((i) => i.id);
  const reviews = ids.length
    ? await db
        .select()
        .from(t.contentReviews)
        .where(inArray(t.contentReviews.entityId, ids))
        .orderBy(desc(t.contentReviews.createdAt))
    : [];
  const latestReview = new Map<string, (typeof reviews)[number]>();
  for (const r of reviews)
    if (!latestReview.has(`${r.entityType}:${r.entityId}`))
      latestReview.set(`${r.entityType}:${r.entityId}`, r);

  const filtered = items.filter((i) => {
    if (!reviewFilter) return true;
    const approved = latestReview.get(`${i.type}:${i.id}`)?.decision === "approved";
    return reviewFilter === "approved" ? approved : !approved;
  });
  const pending = items.filter(
    (i) => latestReview.get(`${i.type}:${i.id}`)?.decision !== "approved",
  ).length;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const qs = (p: number) => {
    const s = new URLSearchParams();
    if (course) s.set("course", course);
    if (type) s.set("type", type);
    if (reviewFilter) s.set("review", reviewFilter);
    if (p > 1) s.set("page", String(p));
    const str = s.toString();
    return str ? `/admin/content?${str}` : "/admin/content";
  };

  return (
    <>
      <PageHeader
        title="Content review"
        description="Every lesson and question version with its provenance and the latest review. Answer keys are never shown here."
      />

      {pending > 0 ? (
        <p className="mb-6 flex items-start gap-2 rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>{pending}</strong> of {items.length} items in this view passed automated
            validation (schema, references, answer keys through the grader, KaTeX, coverage) but
            have <strong>not had human subject-matter review</strong>. Automated checks prove
            internal consistency, not pedagogical quality or curriculum alignment.
          </span>
        </p>
      ) : null}

      <form
        key={`${course}|${type}|${reviewFilter}`}
        method="get"
        action="/admin/content"
        className="mb-6 flex flex-wrap items-end gap-3"
      >
        <div>
          <label htmlFor="f-course" className="mb-1.5 block text-sm font-medium text-ink">
            Course
          </label>
          <Select id="f-course" name="course" defaultValue={course} className="min-w-56">
            <option value="">All courses with content</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-type" className="mb-1.5 block text-sm font-medium text-ink">
            Type
          </label>
          <Select id="f-type" name="type" defaultValue={type}>
            <option value="">Lessons and questions</option>
            <option value="lesson">Lessons</option>
            <option value="question">Questions</option>
          </Select>
        </div>
        <div>
          <label htmlFor="f-review" className="mb-1.5 block text-sm font-medium text-ink">
            Review
          </label>
          <Select id="f-review" name="review" defaultValue={reviewFilter}>
            <option value="">Any</option>
            <option value="pending">Human review pending</option>
            <option value="approved">Approved by reviewer</option>
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          Apply filters
        </Button>
        {course || type || reviewFilter ? (
          <Link href="/admin/content" className="pb-2.5 text-sm text-accent hover:underline">
            Clear
          </Link>
        ) : null}
      </form>

      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {filtered.length} item{filtered.length === 1 ? "" : "s"}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

      <DataTable
        caption="Content items"
        dense
        maxHeight="70dvh"
        columns={[
          {
            key: "item",
            header: "Item",
            rowHeader: true,
            className: "min-w-64 max-w-sm whitespace-normal",
          },
          { key: "course", header: "Course" },
          { key: "version", header: "Version", align: "right" },
          { key: "status", header: "Status" },
          { key: "origin", header: "Provenance", className: "whitespace-normal min-w-44" },
          { key: "review", header: "Latest review", className: "whitespace-normal min-w-56" },
          { key: "checks", header: "Checks", className: "whitespace-normal min-w-40" },
          { key: "reviewer", header: "Reviewer", className: "whitespace-normal" },
        ]}
        rows={shown.map((i) => {
          const r = latestReview.get(`${i.type}:${i.id}`);
          const failed = r?.checks.filter((c) => !c.passed) ?? [];
          return {
            id: `${i.type}:${i.id}`,
            item: (
              <div>
                <span className="block text-ink">{i.title}</span>
                <span className="mt-0.5 block font-mono text-[0.6875rem] text-muted">
                  {i.type} · {i.id}
                </span>
              </div>
            ),
            course: courseName.get(i.courseId) ?? i.courseId,
            version: `v${i.version}`,
            status: (
              <Badge tone={STATUS_TONE[i.status] ?? "neutral"}>{i.status.replace("_", " ")}</Badge>
            ),
            origin: (
              <div className="text-xs">
                <span className="block text-ink">{ORIGIN_LABEL[i.origin] ?? i.origin}</span>
                <span className="text-muted">by {i.author}</span>
              </div>
            ),
            review: r ? (
              <div className="text-xs">
                <Badge tone={DECISION[r.decision]?.tone ?? "neutral"}>
                  {DECISION[r.decision]?.label ?? r.decision}
                </Badge>
                <span className="mt-1 block text-muted">
                  v{r.version} · {formatDate(r.createdAt, { short: true })}
                </span>
                {r.decision !== "approved" ? (
                  <span className="mt-1 block text-warn">Human subject-matter review pending</span>
                ) : null}
              </div>
            ) : (
              <span className="text-xs text-warn">No review recorded</span>
            ),
            checks: r ? (
              <div className="text-xs">
                <span className={failed.length ? "text-bad" : "text-good"}>
                  {r.checks.length - failed.length}/{r.checks.length} passed
                </span>
                {r.checks.length ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-muted">Details</summary>
                    <ul className="mt-1 space-y-0.5">
                      {r.checks.map((c, k) => (
                        <li key={k} className={c.passed ? "text-ink-2" : "text-bad"}>
                          {c.passed ? "✓" : "✗"} {c.name}
                          {c.detail ? ` — ${c.detail}` : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            ) : (
              "—"
            ),
            reviewer: <span className="text-xs">{r?.reviewerLabel ?? i.reviewedBy ?? "—"}</span>,
          };
        })}
        empty={
          <EmptyState
            icon={<FileCheck2 />}
            title="No content matches"
            description="Try another course, type or review filter."
          />
        }
      />

      {pages > 1 ? (
        <nav aria-label="Content pages" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={qs(page - 1)} className="font-medium text-accent hover:underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {page < pages ? (
            <Link href={qs(page + 1)} className="font-medium text-accent hover:underline">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
