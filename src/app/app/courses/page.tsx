import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { CheckCircle2, Search, SearchX } from "lucide-react";
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER } from "@content/index";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  EmptyState,
  PageHeader,
  Section,
  Select,
  formatDate,
  pluralize,
} from "@/components/ui";
import { ContentStatusBadge, ExternalLink } from "@/components/student/Bits";
import { requireStudent } from "@/modules/auth/session";
import { getCatalog, type CatalogRow } from "@/modules/curriculum/queries";
import { getEnrolledCourses } from "@/modules/learning/overview";

export const metadata: Metadata = { title: "Courses" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStudent();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const category = CATEGORY_ORDER.includes(one(sp.category)) ? one(sp.category) : "";
  const withLessons = one(sp.lessons) === "1";

  const [catalog, enrolled] = [
    await getCatalog(),
    await getEnrolledCourses({ id: user.id, role: user.role }, user.id),
  ];
  const enrolledIds = new Set(enrolled.map((e) => e.courseId));

  const needle = q.toLowerCase();
  const filtered = catalog.filter(
    (c) =>
      (!needle ||
        c.name.toLowerCase().includes(needle) ||
        c.description.toLowerCase().includes(needle)) &&
      (!category || c.category === category) &&
      (!withLessons || c.lessonCount > 0),
  );
  const groups = [
    ...CATEGORY_ORDER,
    ...new Set(catalog.map((c) => c.category).filter((c) => !CATEGORY_ORDER.includes(c))),
  ]
    .map((cat) => ({ cat, courses: filtered.filter((c) => c.category === cat) }))
    .filter((g) => g.courses.length > 0);
  const filtering = Boolean(q || category || withLessons);
  const withLessonsCount = catalog.filter((c) => c.lessonCount > 0).length;

  return (
    <>
      <PageHeader
        title="AP courses"
        description={`All ${catalog.length} AP courses College Board publishes. ${withLessonsCount} have AceAP lessons today; the rest show their official outline or catalog entry, labelled honestly.`}
      />

      <Form
        action="/app/courses"
        role="search"
        aria-label="Filter courses"
        className="mb-8 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem] lg:grid-cols-[minmax(0,1fr)_16rem_auto_auto] lg:items-end">
          <div className="space-y-1.5">
            <label htmlFor="catalog-q" className="block text-sm font-medium text-ink">
              Course name
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              />
              <input
                id="catalog-q"
                name="q"
                type="search"
                defaultValue={q}
                maxLength={100}
                placeholder="e.g. Biology, Calculus"
                className="block h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-[0.9375rem] text-ink shadow-card placeholder:text-faint hover:border-faint focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="catalog-category" className="block text-sm font-medium text-ink">
              Category
            </label>
            <Select id="catalog-category" name="category" defaultValue={category}>
              <option value="">All categories</option>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <Checkbox
            name="lessons"
            value="1"
            defaultChecked={withLessons}
            label="Has lessons"
            className="lg:mb-2.5"
            id="catalog-lessons"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary">
              Apply
            </Button>
            {filtering ? (
              <ButtonLink href="/app/courses" variant="ghost">
                Clear
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </Form>

      <p className="mb-6 text-sm text-muted" aria-live="polite">
        {filtering
          ? `Showing ${pluralize(filtered.length, "course")} of ${catalog.length}.`
          : `${catalog.length} courses in ${groups.length} categories.`}
      </p>

      {groups.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No courses match"
          description={
            withLessons
              ? "Only a few courses have lessons so far. Try turning off “Has lessons” or clearing the search."
              : "Try a shorter name, or clear the filters."
          }
          action={
            <ButtonLink href="/app/courses" variant="secondary">
              Clear filters
            </ButtonLink>
          }
        />
      ) : (
        groups.map((g) => (
          <Section
            key={g.cat}
            id={`cat-${g.cat}`}
            title={CATEGORY_LABELS[g.cat] ?? g.cat}
            description={pluralize(g.courses.length, "course")}
          >
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.courses.map((c) => (
                <li key={c.id}>
                  <CourseCard course={c} enrolled={enrolledIds.has(c.id)} />
                </li>
              ))}
            </ul>
          </Section>
        ))
      )}

      <footer className="mt-12 border-t border-line pt-6 text-xs leading-relaxed text-muted">
        <p>
          Course list and unit titles verified on{" "}
          {formatDate(CATALOG.verifiedOn, { timeZone: "UTC" })} against the{" "}
          <ExternalLink href={CATALOG.indexSourceUrl}>AP Central course index</ExternalLink>. AceAP
          content statuses are computed from what actually exists, never set by hand.
        </p>
        <p className="mt-2">
          AP® and Advanced Placement® are registered trademarks of College Board, which is not
          affiliated with, and does not endorse, AceAP.
        </p>
      </footer>
    </>
  );
}

function CourseCard({ course: c, enrolled }: { course: CatalogRow; enrolled: boolean }) {
  const upcoming = c.availability === "upcoming";
  return (
    <Card interactive className="flex h-full flex-col p-5 sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ContentStatusBadge status={c.contentStatus} />
        {upcoming ? <Badge tone="warn">Upcoming</Badge> : null}
        {enrolled ? (
          <Badge tone="good" icon={<CheckCircle2 className="size-3" />}>
            In my courses
          </Badge>
        ) : null}
      </div>
      <h3 className="mt-3 font-display text-base font-semibold leading-snug text-ink">
        <Link
          href={`/app/courses/${c.id}`}
          className="after:absolute after:inset-0 after:rounded-card hover:underline underline-offset-4"
        >
          {c.name}
        </Link>
      </h3>
      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted">{c.description}</p>
      {upcoming && c.availabilityNote ? (
        <p className="mt-2 text-xs font-medium text-warn">{c.availabilityNote}</p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4 text-xs text-muted">
        <span>
          {c.unitCount ? pluralize(c.unitCount, "unit") : "No titled units"}
          {c.lessonCount ? <> · {pluralize(c.lessonCount, "lesson")}</> : null}
        </span>
        <ExternalLink href={c.sourceUrl} className="relative z-10 text-xs">
          College Board page
        </ExternalLink>
      </div>
    </Card>
  );
}
