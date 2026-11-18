import type { Metadata } from "next";
import Link from "next/link";
import { inArray } from "drizzle-orm";
import { ClipboardList, Plus } from "lucide-react";
import { asUser, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import { ArchiveAssignmentButton } from "@/components/assignments/ArchiveAssignmentButton";
import { ClassPicker } from "@/components/assignments/ClassPicker";
import { GRADING_LABEL, KIND_LABEL } from "@/components/assignments/labels";
import {
  Badge,
  ButtonLink,
  DataTable,
  EmptyState,
  PageHeader,
  Pill,
  formatDate,
} from "@/components/ui";
import { requireStaff } from "@/modules/auth/session";
import { listClassesForStaff } from "@/modules/classrooms/service";
import { getGradebook } from "@/modules/gradebook/service";
import { archiveAssignmentAction } from "./actions";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStaff();
  const params = await searchParams;
  const classParam = typeof params.class === "string" ? params.class : null;
  const classes = await listClassesForStaff(user);
  const selected = classParam ? (classes.find((c) => c.id === classParam) ?? null) : null;
  const scope = selected ? [selected] : classParam ? [] : classes;

  const books = await Promise.all(scope.map((c) => getGradebook(user, c.id)));
  const allIds = books.flatMap((b) => b.assignments.map((a) => a.id));
  const targetRows = allIds.length
    ? await asUser(user as Actor, (tx) =>
        tx
          .select({ assignmentId: t.assignmentTargets.assignmentId })
          .from(t.assignmentTargets)
          .where(inArray(t.assignmentTargets.assignmentId, allIds)),
      )
    : [];
  const targeted = new Map<string, number>();
  for (const r of targetRows) targeted.set(r.assignmentId, (targeted.get(r.assignmentId) ?? 0) + 1);

  const rows = books
    .flatMap((gb) =>
      gb.assignments.map((a) => {
        const cells = gb.students
          .map((s) => gb.cells[s.id]?.[a.id])
          .filter((c): c is NonNullable<typeof c> => Boolean(c));
        const submitted = cells.filter((c) => c.attempts > 0).length;
        const late = cells.filter((c) => c.status === "late").length;
        const missing = cells.filter((c) => c.status === "missing").length;
        return {
          a,
          gb,
          total: cells.length,
          submitted,
          late,
          missing,
          targets: targeted.get(a.id) ?? 0,
        };
      }),
    )
    .sort((x, y) => (x.a.dueAt?.getTime() ?? Infinity) - (y.a.dueAt?.getTime() ?? Infinity));

  const newHref = selected
    ? `/teacher/assignments/new?class=${selected.id}`
    : "/teacher/assignments/new";

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Everything you've assigned, with who has turned it in. Open an assignment for per-student status, accommodations and written responses to score."
        actions={
          classes.length > 0 ? (
            <ButtonLink href={newHref} icon={<Plus aria-hidden="true" className="size-4" />}>
              New assignment
            </ButtonLink>
          ) : null
        }
      />
      {classes.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="No classes yet"
          description="Create a class and invite students before assigning work."
          action={<ButtonLink href="/teacher/classes">Go to classes</ButtonLink>}
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <ClassPicker
              basePath="/teacher/assignments"
              classes={classes.map((c) => ({ id: c.id, name: c.name, detail: c.courseName }))}
              value={selected?.id ?? null}
              allowAll
            />
            <p className="text-sm text-muted" aria-live="polite">
              {rows.length} active assignment{rows.length === 1 ? "" : "s"}
            </p>
          </div>
          {classParam && !selected ? (
            <EmptyState
              title="Class not available"
              description="That class doesn't exist or isn't one of yours."
              action={
                <ButtonLink variant="secondary" href="/teacher/assignments">
                  Show all classes
                </ButtonLink>
              }
            />
          ) : (
            <DataTable
              caption="Assignments"
              columns={[
                {
                  key: "title",
                  header: "Assignment",
                  rowHeader: true,
                  className: "min-w-64 max-w-sm whitespace-normal",
                },
                { key: "class", header: "Class" },
                { key: "due", header: "Due" },
                { key: "audience", header: "Assigned to" },
                { key: "progress", header: "Submitted", align: "right" },
                { key: "late", header: "Late", align: "right" },
                { key: "grading", header: "Grading" },
                {
                  key: "actions",
                  header: <span className="sr-only">Actions</span>,
                  align: "right",
                },
              ]}
              rows={rows.map(({ a, gb, total, submitted, late, missing, targets }) => ({
                id: a.id,
                title: (
                  <div className="min-w-0">
                    <Link
                      href={`/teacher/assignments/${a.id}`}
                      className="font-medium text-ink underline-offset-4 hover:text-accent hover:underline"
                    >
                      {a.title}
                    </Link>
                    <div className="mt-1">
                      <Pill>{KIND_LABEL[a.kind]}</Pill>
                    </div>
                  </div>
                ),
                class: gb.class.name,
                due: a.dueAt ? (
                  formatDate(a.dueAt, { withTime: true, short: true })
                ) : (
                  <span className="text-muted">No due date</span>
                ),
                audience: targets ? (
                  <Badge tone="info">
                    {targets} selected student{targets === 1 ? "" : "s"}
                  </Badge>
                ) : (
                  <span>Whole class</span>
                ),
                progress: (
                  <span>
                    {submitted}/{total}
                    {missing ? (
                      <span className="ml-2 text-xs font-medium text-bad">{missing} missing</span>
                    ) : null}
                  </span>
                ),
                late: late ? (
                  <Badge tone="warn">{late}</Badge>
                ) : (
                  <span className="text-muted">0</span>
                ),
                grading: GRADING_LABEL[a.gradingMethod],
                actions: (
                  <ArchiveAssignmentButton
                    assignmentId={a.id}
                    title={a.title}
                    action={archiveAssignmentAction}
                  />
                ),
              }))}
              empty={
                <EmptyState
                  icon={<ClipboardList />}
                  title="Nothing assigned yet"
                  description="Assign a lesson, targeted skill practice or a quiz. Students see it on their Assignments page."
                  action={<ButtonLink href={newHref}>New assignment</ButtonLink>}
                />
              }
            />
          )}
        </>
      )}
    </>
  );
}
