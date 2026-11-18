import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  FunctionSquare,
  GraduationCap,
  Layers,
  NotebookPen,
  Search,
  SearchX,
  Target,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import { Markdown } from "@/components/content/Markdown";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Section,
  Select,
  pluralize,
} from "@/components/ui";
import { DomainError } from "@/lib/errors";
import { requireStudent } from "@/modules/auth/session";
import { getCatalog, getCourseTree } from "@/modules/curriculum/queries";
import {
  search,
  type SearchGroup,
  type SearchResponse,
  type SearchResult,
} from "@/modules/search/service";

export const metadata: Metadata = { title: "Search" };

const GROUPS: { key: SearchGroup; title: string; icon: ReactNode }[] = [
  { key: "lessons", title: "Lessons", icon: <BookOpen /> },
  { key: "skills", title: "Skills", icon: <Target /> },
  { key: "formulas", title: "Formulas", icon: <FunctionSquare /> },
  { key: "objectives", title: "Learning objectives", icon: <Trophy /> },
  { key: "units", title: "Units", icon: <Layers /> },
  { key: "courses", title: "Courses", icon: <GraduationCap /> },
  { key: "notes", title: "Your notes", icon: <NotebookPen /> },
];
const GROUP_LABEL: Record<SearchGroup, string> = {
  lessons: "Lesson",
  skills: "Skill",
  formulas: "Formula",
  objectives: "Objective",
  units: "Unit",
  courses: "Course",
  notes: "Note",
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** The search index links notes to the notes workspace (/app/vault/notes?note=…); results open the note itself. */
const hrefFor = (r: SearchResult) =>
  r.group === "notes" ? `/app/vault/notes/${encodeURIComponent(r.id)}` : r.href;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStudent();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 200);
  const catalog = await getCatalog();
  const courseParam = one(sp.course);
  const course = catalog.find((c) => c.id === courseParam) ?? null;

  let results: SearchResponse | null = null;
  let error: string | null = null;
  if (q) {
    try {
      results = await search({ id: user.id, role: user.role }, q, {
        courseId: course?.id,
        limit: 8,
      });
    } catch (e) {
      if (e instanceof DomainError) error = e.message;
      else throw e;
    }
  }

  // Suggestions come from real skill names in courses that have lessons.
  const suggestions: string[] = [];
  if (!q || (results && results.best.length === 0)) {
    for (const c of catalog.filter((x) => x.lessonCount > 0).slice(0, 3)) {
      const tree = await getCourseTree(c.id);
      for (const id of tree?.skillIds.slice(0, 2) ?? []) {
        const name = tree?.skills.get(id)?.name;
        if (name) suggestions.push(name);
      }
    }
  }
  const total = results ? GROUPS.reduce((n, g) => n + results[g.key].length, 0) : 0;

  return (
    <>
      <PageHeader
        title={q ? <>Results for “{q}”</> : "Search"}
        description="Lessons, skills, formulas, units, all 43 AP courses, and your own notes. Answers to questions are never searchable."
      />

      <Form
        action="/app/search"
        role="search"
        aria-label="Search AceAP"
        className="mb-8 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5"
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem_auto] md:items-end">
          <div className="space-y-1.5">
            <label htmlFor="search-q" className="block text-sm font-medium text-ink">
              Search for
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              />
              <input
                id="search-q"
                name="q"
                type="search"
                defaultValue={q}
                maxLength={200}
                required
                placeholder="e.g. chain rule, marginal cost, velocity"
                className="block h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-[0.9375rem] text-ink shadow-card placeholder:text-faint hover:border-faint focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="search-course" className="block text-sm font-medium text-ink">
              Course
            </label>
            <Select id="search-course" name="course" defaultValue={course?.id ?? ""}>
              <option value="">All courses</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit">Search</Button>
        </div>
      </Form>

      {error ? (
        <ErrorState
          title="We couldn't run that search"
          description={error}
          retry={{ href: "/app/search", label: "Start over" }}
        />
      ) : !q ? (
        <EmptyState
          icon={<Search />}
          title="What are you looking for?"
          description="Search by topic, skill or formula. Try one of these:"
          action={<Suggestions items={suggestions} courseId={course?.id} />}
        />
      ) : results && total === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No matches"
          description={
            <>
              Nothing matched “{q}”{course ? ` in ${course.name}` : ""}. Check the spelling, use
              fewer words, or {course ? "search all courses" : "try a related term"}.
            </>
          }
          action={
            <div className="flex flex-col items-center gap-4">
              {course ? (
                <ButtonLink href={`/app/search?q=${encodeURIComponent(q)}`} variant="secondary">
                  Search all courses
                </ButtonLink>
              ) : null}
              <Suggestions items={suggestions} />
            </div>
          }
        />
      ) : results ? (
        <>
          <p className="mb-2 text-sm text-muted" aria-live="polite">
            {pluralize(total, "result")}
            {course ? ` in ${course.name}` : ""}.{" "}
            {course ? (
              <Link
                href={`/app/search?q=${encodeURIComponent(q)}`}
                className="text-accent underline-offset-4 hover:underline"
              >
                Search all courses
              </Link>
            ) : null}
          </p>
          {results.best.length ? (
            <Section title="Best matches" id="best">
              <Card padded={false}>
                <ul className="divide-y divide-line">
                  {results.best.slice(0, 4).map((r) => (
                    <ResultRow key={`best-${r.group}-${r.id}`} r={r} showGroup />
                  ))}
                </ul>
              </Card>
            </Section>
          ) : null}
          {GROUPS.filter((g) => results[g.key].length > 0).map((g) => (
            <Section
              key={g.key}
              id={`group-${g.key}`}
              title={g.title}
              description={pluralize(results[g.key].length, "match", "matches")}
            >
              <Card padded={false}>
                <ul className="divide-y divide-line">
                  {results[g.key].map((r) => (
                    <ResultRow key={`${g.key}-${r.id}`} r={r} />
                  ))}
                </ul>
              </Card>
            </Section>
          ))}
        </>
      ) : null}
    </>
  );
}

function Suggestions({ items, courseId }: { items: string[]; courseId?: string }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {items.map((s) => (
        <li key={s}>
          <Link
            href={`/app/search?q=${encodeURIComponent(s)}${courseId ? `&course=${encodeURIComponent(courseId)}` : ""}`}
            className="inline-flex rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-2 hover:border-line-strong hover:text-ink"
          >
            {s}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ResultRow({ r, showGroup = false }: { r: SearchResult; showGroup?: boolean }) {
  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        {showGroup ? <span className="font-medium text-accent">{GROUP_LABEL[r.group]}</span> : null}
        {showGroup && r.courseName ? <span aria-hidden="true">·</span> : null}
        {r.courseName && r.group !== "courses" ? <span>{r.courseName}</span> : null}
        {r.availability === "outline_only" ? <Badge tone="info">Outline only</Badge> : null}
        {r.availability === "catalog_only" ? <Badge>Catalog only</Badge> : null}
      </div>
      <h3 className="mt-0.5 text-[0.9375rem] font-semibold text-ink">
        <Link href={hrefFor(r)} className="hover:underline underline-offset-4">
          {r.title}
        </Link>
      </h3>
      {r.latex ? (
        <div className="mt-2 overflow-x-auto rounded-lg bg-surface-2 px-3 py-1">
          <Markdown compact>{`$$${r.latex}$$`}</Markdown>
        </div>
      ) : null}
      {r.snippet ? <p className="mt-1 line-clamp-2 text-sm text-muted">{r.snippet}</p> : null}
      {r.reason ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-faint">
          <FileText aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
          <span>
            <span className="sr-only">Why this matched: </span>
            {r.reason}
          </span>
        </p>
      ) : null}
    </li>
  );
}
