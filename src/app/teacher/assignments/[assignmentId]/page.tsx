import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { PenLine, Table2 } from "lucide-react";
import { asUser, getDb, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import { AccommodationEditor } from "@/components/assignments/AccommodationEditor";
import { ArchiveAssignmentButton } from "@/components/assignments/ArchiveAssignmentButton";
import { CreatedToast } from "@/components/assignments/CreatedToast";
import {
  AI_LABEL,
  CELL_STATUS_TONE,
  FEEDBACK_LABEL,
  GRADING_EXPLANATION,
  GRADING_LABEL,
  KIND_LABEL,
} from "@/components/assignments/labels";
import { RubricGradeForm } from "@/components/assignments/RubricGradeForm";
import { InlineMarkdown, Markdown } from "@/components/content/Markdown";
import { STATUS_TEXT, pct } from "@/components/gradebook/explain";
import { loadGradebookView } from "@/components/gradebook/load";
import { CanvasSyncPanel } from "@/components/gradebook/CanvasSyncPanel";
import { toPanelData } from "@/components/gradebook/passback";
import { getAssignmentPassback } from "@/modules/integrations/lms/passback";
import {
  loadCanvasSyncAction,
  retryGradeSyncAction,
  sendAssignmentGradesAction,
} from "../../gradebook/actions";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  KeyValue,
  PageHeader,
  Pill,
  Section,
  Tooltip,
  formatDate,
} from "@/components/ui";
import { DomainError } from "@/lib/errors";
import { requireStaff } from "@/modules/auth/session";
import { assertClassStaff } from "@/modules/classrooms/service";
import {
  archiveAssignmentAction,
  gradeWrittenResponseAction,
  setAccommodationAction,
} from "../actions";

export const metadata: Metadata = { title: "Assignment" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCE_SHORT = {
  none: "",
  score: "score",
  mastery: "mastery",
  completion: "completion",
  override: "override",
} as const;

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStaff();
  const { assignmentId } = await params;
  const sp = await searchParams;
  if (!UUID.test(assignmentId)) notFound();

  const db = await getDb();
  const [assignment] = await db
    .select()
    .from(t.assignments)
    .where(eq(t.assignments.id, assignmentId));
  if (!assignment) notFound();
  let cls: typeof t.classes.$inferSelect;
  try {
    cls = await assertClassStaff(db, user, assignment.classId);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  const view = await loadGradebookView(user, cls.id);
  const { tree } = view;
  const canvasSync = toPanelData(await getAssignmentPassback(user, assignmentId, { gradebook: view.gb }));
  const archived = assignment.archivedAt !== null;

  const [targets, overrides, pending] = await asUser(user as Actor, async (tx) => {
    const tg = await tx
      .select({ studentId: t.assignmentTargets.studentId })
      .from(t.assignmentTargets)
      .where(eq(t.assignmentTargets.assignmentId, assignmentId));
    const ov = await tx
      .select()
      .from(t.assignmentOverrides)
      .where(eq(t.assignmentOverrides.assignmentId, assignmentId));
    const pr = await tx
      .select({
        id: t.questionResponses.id,
        userId: t.questionResponses.userId,
        questionId: t.questionResponses.questionId,
        version: t.questionResponses.questionVersion,
        response: t.questionResponses.response,
        createdAt: t.questionResponses.createdAt,
      })
      .from(t.questionResponses)
      .innerJoin(t.attempts, eq(t.attempts.id, t.questionResponses.attemptId))
      .where(and(eq(t.attempts.assignmentId, assignmentId), isNull(t.questionResponses.score)));
    return [tg, ov, pr] as const;
  });

  // Rubrics live in question_versions (not readable by the app role); staff access is already proven.
  const versions = pending.length
    ? await db
        .select({
          questionId: t.questionVersions.questionId,
          version: t.questionVersions.version,
          prompt: t.questionVersions.prompt,
          body: t.questionVersions.body,
        })
        .from(t.questionVersions)
        .where(
          inArray(t.questionVersions.questionId, [...new Set(pending.map((p) => p.questionId))]),
        )
    : [];

  const targetIds = new Set(targets.map((x) => x.studentId));
  const students = view.students.filter((s) => targetIds.size === 0 || targetIds.has(s.id));
  const overrideBy = new Map(overrides.map((o) => [o.studentId, o]));
  const nameOf = new Map(view.students.map((s) => [s.id, s.name]));
  const column = view.assignments.find((a) => a.id === assignmentId);

  const content =
    assignment.kind === "lesson"
      ? (tree?.lessons.get(assignment.lessonId ?? "")?.title ?? assignment.lessonId)
      : assignment.kind === "assessment"
        ? (tree?.assessments.find((a) => a.id === assignment.assessmentId)?.title ??
          assignment.assessmentId)
        : `${assignment.questionCount} questions per set`;

  const cells = students.map((s) => ({ s, cell: view.cells[s.id]?.[assignmentId] ?? null }));
  const submitted = cells.filter((c) => (c.cell?.attempts ?? 0) > 0).length;
  const late = cells.filter((c) => c.cell?.status === "late").length;
  const missing = cells.filter((c) => c.cell?.status === "missing").length;

  const createdParam =
    typeof sp.created === "string" && /^\d+$/.test(sp.created) ? Number(sp.created) : null;

  return (
    <>
      <CreatedToast assignedTo={createdParam} />
      <PageHeader
        breadcrumbs={[
          { label: "Assignments", href: `/teacher/assignments?class=${cls.id}` },
          { label: assignment.title },
        ]}
        eyebrow={`${cls.name} · ${KIND_LABEL[assignment.kind]}`}
        title={assignment.title}
        description={assignment.instructions || undefined}
        actions={
          <>
            {!archived ? (
              <ButtonLink
                variant="secondary"
                href={`/teacher/gradebook?class=${cls.id}#col-${assignmentId}`}
                icon={<Table2 aria-hidden="true" className="size-4" />}
              >
                Gradebook column
              </ButtonLink>
            ) : null}
            {!archived ? (
              <ArchiveAssignmentButton
                assignmentId={assignmentId}
                title={assignment.title}
                action={archiveAssignmentAction}
              />
            ) : null}
          </>
        }
      />

      {archived ? (
        <p role="status" className="mb-6 rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
          Archived {formatDate(assignment.archivedAt, { withTime: true })}. Students no longer see
          it and it is left out of the gradebook. Submissions and evidence were kept.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card padded={false}>
          <CardHeader title="Settings" titleAs="h2" />
          <CardBody>
            <KeyValue
              layout="stacked"
              items={[
                { label: "Content", value: content ?? "—" },
                ...(assignment.skillIds.length
                  ? [
                      {
                        label: assignment.kind === "skill_practice" ? "Skills" : "Skills covered",
                        value: (
                          <span className="flex flex-wrap gap-1">
                            {assignment.skillIds.map((id) => (
                              <Pill key={id}>{tree?.skills.get(id)?.name ?? id}</Pill>
                            ))}
                          </span>
                        ),
                      },
                    ]
                  : []),
                {
                  label: "Assigned to",
                  value: targetIds.size
                    ? `${targetIds.size} selected student${targetIds.size === 1 ? "" : "s"}`
                    : "Whole class",
                },
                {
                  label: "Opens",
                  value: assignment.availableFrom
                    ? formatDate(assignment.availableFrom, { withTime: true })
                    : "Immediately",
                },
                {
                  label: "Due",
                  value: assignment.dueAt
                    ? formatDate(assignment.dueAt, { withTime: true })
                    : "No due date",
                },
                { label: "Attempts", value: assignment.maxAttempts ?? "Unlimited" },
                {
                  label: "Grading",
                  value: (
                    <Tooltip content={GRADING_EXPLANATION[assignment.gradingMethod]}>
                      <button
                        type="button"
                        className="cursor-help underline decoration-dotted underline-offset-4"
                      >
                        {GRADING_LABEL[assignment.gradingMethod]} · {assignment.points} pts
                      </button>
                    </Tooltip>
                  ),
                },
                { label: "Assistance", value: AI_LABEL[assignment.aiPolicy] },
                { label: "Feedback", value: FEEDBACK_LABEL[assignment.feedback] },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <h2 className="font-display text-[1.0625rem] font-semibold text-ink">Turned in</h2>
          <p className="mt-2 font-display text-[1.75rem] font-semibold tabular-nums text-ink">
            {submitted}/{students.length}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
            <li>{late} late</li>
            <li>{missing} missing (past due, nothing submitted)</li>
            <li>
              {pending.length} written response{pending.length === 1 ? "" : "s"} awaiting scoring
            </li>
            {column ? <li>Class average: {pct(column.average)}</li> : null}
          </ul>
        </Card>
      </div>

      <Section
        title="Students"
        description="Status and grade come straight from the gradebook, including overrides and accommodations."
        className="mt-10"
      >
        <DataTable
          caption={`Per-student status for ${assignment.title}`}
          columns={[
            { key: "name", header: "Student", rowHeader: true },
            { key: "status", header: "Status" },
            { key: "attempts", header: "Attempts", align: "right" },
            { key: "best", header: "Best score", align: "right" },
            { key: "grade", header: "Grade" },
            {
              key: "accommodation",
              header: "Accommodations",
              className: "min-w-56 whitespace-normal",
            },
            {
              key: "edit",
              header: <span className="sr-only">Edit accommodations</span>,
              align: "right",
            },
          ]}
          rows={cells.map(({ s, cell }) => {
            const o = overrideBy.get(s.id);
            const acc = o
              ? [
                  o.timeMultiplier ? `${o.timeMultiplier}× time` : null,
                  o.dueAt ? `due ${formatDate(o.dueAt, { withTime: true, short: true })}` : null,
                  o.maxAttempts ? `${o.maxAttempts} attempts` : null,
                ].filter(Boolean)
              : [];
            return {
              id: s.id,
              name: s.name,
              status: cell ? (
                <Badge tone={CELL_STATUS_TONE[cell.status]}>{STATUS_TEXT[cell.status]}</Badge>
              ) : (
                <span className="text-muted">—</span>
              ),
              attempts: cell?.attempts ?? 0,
              best: cell?.bestScore ?? <span className="text-muted">—</span>,
              grade: cell ? (
                <Tooltip content={cell.explanation.join(" ")}>
                  <button
                    type="button"
                    className="cursor-help text-left tabular-nums underline decoration-dotted underline-offset-4"
                  >
                    {pct(cell.percent)}
                    {SOURCE_SHORT[cell.sourceKind] ? (
                      <span className="ml-1 text-xs text-muted">
                        · {SOURCE_SHORT[cell.sourceKind]}
                      </span>
                    ) : null}
                  </button>
                </Tooltip>
              ) : (
                <span className="text-muted">{archived ? "Archived" : "—"}</span>
              ),
              accommodation: o ? (
                <div className="text-sm">
                  {acc.length ? (
                    <span className="text-ink">{acc.join(" · ")}</span>
                  ) : (
                    <span className="text-muted">Note only</span>
                  )}
                  {o.note ? <p className="mt-0.5 text-xs text-muted">{o.note}</p> : null}
                </div>
              ) : (
                <span className="text-muted">None</span>
              ),
              edit: (
                <AccommodationEditor
                  assignmentId={assignmentId}
                  student={s}
                  classDueLabel={
                    assignment.dueAt ? formatDate(assignment.dueAt, { withTime: true }) : null
                  }
                  current={
                    o
                      ? {
                          dueAt: o.dueAt ? o.dueAt.toISOString() : null,
                          maxAttempts: o.maxAttempts,
                          timeMultiplier: o.timeMultiplier,
                          note: o.note,
                        }
                      : null
                  }
                  action={setAccommodationAction}
                />
              ),
            };
          })}
          empty={
            <EmptyState
              title="No students"
              description="No students in this class receive this assignment yet."
            />
          }
        />
      </Section>

      <Section
        title="Canvas grade sync"
        description="Grades go to Canvas only when you send them. Each row shows whether Canvas has confirmed the student's grade."
        className="mt-10"
      >
        <Card>
          <CanvasSyncPanel
            assignmentId={assignmentId}
            assignmentTitle={assignment.title}
            initial={canvasSync}
            headingLevel="h3"
            actions={{
              load: loadCanvasSyncAction,
              send: sendAssignmentGradesAction,
              retry: retryGradeSyncAction,
            }}
          />
        </Card>
      </Section>

      <Section
        title="Written responses awaiting scoring"
        description="Short written answers are scored by you with the rubric. The score becomes mastery evidence and updates the student's grade."
        className="mt-10"
      >
        {pending.length === 0 ? (
          <EmptyState
            icon={<PenLine />}
            title="Nothing to score"
            description="No written responses on this assignment are waiting for a rubric score."
          />
        ) : (
          <ul className="space-y-4">
            {pending.map((p) => {
              const v = versions.find(
                (x) => x.questionId === p.questionId && x.version === p.version,
              );
              const body = v?.body;
              const text =
                typeof p.response === "object" && p.response && "text" in p.response
                  ? String((p.response as { text: unknown }).text ?? "")
                  : "";
              return (
                <li key={p.id}>
                  <Card padded={false}>
                    <CardHeader
                      title={nameOf.get(p.userId) ?? "Student"}
                      description={`Submitted ${formatDate(p.createdAt, { withTime: true })}`}
                      titleAs="h3"
                    />
                    <CardBody className="grid gap-6 lg:grid-cols-2">
                      <div className="min-w-0 space-y-3">
                        {v ? (
                          <div className="text-sm text-ink-2">
                            <Markdown compact>{v.prompt}</Markdown>
                          </div>
                        ) : null}
                        <div>
                          <p className="text-xs font-semibold text-muted">Student response</p>
                          <p className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink">
                            {text || "(empty)"}
                          </p>
                        </div>
                        {body && body.type === "short_response" ? (
                          <details className="text-sm">
                            <summary className="cursor-pointer font-medium text-accent">
                              Sample response
                            </summary>
                            <div className="mt-2 text-ink-2">
                              <InlineMarkdown>{body.sampleResponse}</InlineMarkdown>
                            </div>
                          </details>
                        ) : null}
                      </div>
                      {body && body.type === "short_response" ? (
                        <RubricGradeForm
                          responseId={p.id}
                          assignmentId={assignmentId}
                          rubric={body.rubric}
                          action={gradeWrittenResponseAction}
                        />
                      ) : (
                        <p className="text-sm text-muted">
                          This response can&apos;t be scored here (rubric not found).
                        </p>
                      )}
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <p className="mt-10 text-sm text-muted">
        Grades on this page follow the class&apos;s{" "}
        <Link
          className="font-medium text-accent underline-offset-4 hover:underline"
          href={`/teacher/gradebook/policy?class=${cls.id}`}
        >
          grading policy
        </Link>
        . Overrides change the recorded grade only; student responses and mastery evidence are never
        modified.
      </p>
    </>
  );
}
