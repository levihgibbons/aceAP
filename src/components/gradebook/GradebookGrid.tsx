"use client";
/**
 * Students × assignments matrix. Scrolls horizontally inside its own container
 * with a sticky student column. Each cell is a button that opens a drawer
 * explaining the grade's source, with override / comment / excuse actions.
 */
import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { MessageSquare, Upload } from "lucide-react";
import { Badge, Button, Drawer, Field, Input, Textarea, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/components/assignments/action-state";
import {
  CELL_STATUS_TONE,
  GRADING_EXPLANATION,
  GRADING_LABEL,
  KIND_LABEL,
} from "@/components/assignments/labels";
import type { GridAssignment, GridCell, GridStudent } from "./load";
import { CanvasSyncPanel, type CanvasSyncActions } from "./CanvasSyncPanel";

/** Per-assignment Canvas passback summary for the column headers (only when the school has a connection). */
export interface GridCanvas {
  assignments: Record<string, { canSend: boolean; short: string }>;
  actions: CanvasSyncActions;
}

export interface GradebookActions {
  setOverride: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  clearOverride: (assignmentId: string, studentId: string) => Promise<ActionState>;
  setComment: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  setExcused: (assignmentId: string, studentId: string, excused: boolean) => Promise<ActionState>;
}

const STATUS_CHIP: Record<string, string | null> = {
  missing: "Missing",
  late: "Late",
  excused: "Excused",
  awaiting_grading: "Awaiting grading",
  not_submitted: null,
  submitted: null,
};
const STATUS_TEXT: Record<string, string> = {
  not_submitted: "Not submitted",
  submitted: "Submitted",
  late: "Late",
  awaiting_grading: "Awaiting grading",
  excused: "Excused",
  missing: "Missing",
};

const fmt = (x: number | null) =>
  x === null ? "—" : `${Number.isInteger(x) ? x : Math.round(x * 10) / 10}%`;

export function GradebookGrid({
  className,
  assignments,
  students,
  cells,
  averageMethod,
  actions,
  canvas,
}: {
  className: string;
  assignments: GridAssignment[];
  students: GridStudent[];
  cells: Record<string, Record<string, GridCell>>;
  averageMethod: string;
  actions: GradebookActions;
  canvas?: GridCanvas;
}) {
  const [selected, setSelected] = useState<{ studentId: string; assignmentId: string } | null>(
    null,
  );
  const [canvasColumn, setCanvasColumn] = useState<string | null>(null);
  const canvasAssignment = canvasColumn
    ? assignments.find((a) => a.id === canvasColumn)
    : undefined;
  const student = selected ? students.find((s) => s.id === selected.studentId) : undefined;
  const assignment = selected ? assignments.find((a) => a.id === selected.assignmentId) : undefined;
  const cell = selected ? cells[selected.studentId]?.[selected.assignmentId] : undefined;

  return (
    <>
      <div
        className={cn(
          "overflow-auto rounded-card border border-line bg-surface shadow-card",
          "max-h-[70dvh]",
        )}
        role="region"
        aria-label={`Gradebook for ${className}`}
        tabIndex={0}
      >
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            Grades for {className}. Rows are students, columns are assignments. Select a grade to
            see where it came from and to adjust it.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 top-0 z-30 min-w-44 border-b border-r border-line bg-surface-2 px-3 py-2.5 text-left text-xs font-semibold text-muted"
              >
                Student
              </th>
              <th
                scope="col"
                className="sticky top-0 z-20 border-b border-line bg-surface-2 px-3 py-2.5 text-right text-xs font-semibold text-muted"
              >
                <abbr title={averageMethod} className="cursor-help no-underline">
                  Average*
                </abbr>
              </th>
              {assignments.map((a) => (
                <th
                  key={a.id}
                  id={`col-${a.id}`}
                  scope="col"
                  className="sticky top-0 z-20 min-w-36 max-w-48 scroll-mt-4 border-b border-line bg-surface-2 px-3 py-2.5 text-left align-bottom text-xs font-semibold text-muted"
                >
                  <Link
                    href={`/teacher/assignments/${a.id}`}
                    className="line-clamp-2 whitespace-normal text-[0.8125rem] font-semibold text-ink hover:text-accent hover:underline"
                  >
                    {a.title}
                  </Link>
                  <span
                    className="mt-0.5 block font-normal"
                    title={GRADING_EXPLANATION[a.gradingMethod]}
                  >
                    {KIND_LABEL[a.kind]} · {GRADING_LABEL[a.gradingMethod]} · {a.points} pts
                  </span>
                  {a.dueLabel ? <span className="block font-normal">Due {a.dueLabel}</span> : null}
                  {canvas?.assignments[a.id] ? (
                    <button
                      type="button"
                      onClick={() => setCanvasColumn(a.id)}
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-normal hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
                        canvas.assignments[a.id].canSend ? "text-accent" : "text-muted",
                      )}
                      aria-label={`Canvas: ${canvas.assignments[a.id].short} — grade sync for ${a.title}`}
                    >
                      <Upload aria-hidden="true" className="size-3" />
                      Canvas: {canvas.assignments[a.id].short}
                    </button>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="group">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-r border-line bg-surface px-3 py-2 text-left font-medium text-ink group-hover:bg-surface-2"
                >
                  {s.name}
                </th>
                <td className="border-b border-line px-3 py-2 text-right font-semibold tabular-nums text-ink group-hover:bg-surface-2">
                  {fmt(s.average)}
                </td>
                {assignments.map((a) => {
                  const c = cells[s.id]?.[a.id];
                  if (!c)
                    return (
                      <td
                        key={a.id}
                        className="border-b border-line px-3 py-2 text-xs text-faint group-hover:bg-surface-2"
                      >
                        <span aria-label="Not assigned to this student">n/a</span>
                      </td>
                    );
                  const chip = STATUS_CHIP[c.status];
                  return (
                    <td key={a.id} className="border-b border-line p-1 group-hover:bg-surface-2">
                      <button
                        type="button"
                        onClick={() => setSelected({ studentId: s.id, assignmentId: a.id })}
                        className="flex w-full flex-col items-start gap-1 rounded-md px-2 py-1.5 text-left hover:bg-sunken focus-visible:outline-2 focus-visible:outline-accent"
                        aria-label={`${s.name}, ${a.title}: ${fmt(c.percent)}, ${STATUS_TEXT[c.status]}${c.override ? ", overridden" : ""}${c.comment ? ", has comment" : ""}. Open details.`}
                      >
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            c.percent === null ? "text-faint" : "text-ink",
                          )}
                        >
                          {fmt(c.percent)}
                        </span>
                        <span className="flex flex-wrap items-center gap-1">
                          {chip ? <Badge tone={CELL_STATUS_TONE[c.status]}>{chip}</Badge> : null}
                          {c.override ? <Badge tone="accent">Overridden</Badge> : null}
                          {c.comment ? (
                            <MessageSquare aria-hidden="true" className="size-3.5 text-muted" />
                          ) : null}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th
                scope="row"
                className="sticky bottom-0 left-0 z-20 border-r border-t border-line bg-surface-2 px-3 py-2.5 text-left text-xs font-semibold text-muted"
              >
                Class average
              </th>
              <td className="sticky bottom-0 z-10 border-t border-line bg-surface-2" />
              {assignments.map((a) => (
                <td
                  key={a.id}
                  className="sticky bottom-0 z-10 border-t border-line bg-surface-2 px-3 py-2.5 text-xs font-semibold tabular-nums text-ink-2"
                >
                  {fmt(a.average)}
                  <span className="ml-1 font-normal text-muted">({a.counted})</span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        * {averageMethod} Numbers in brackets are how many grades each class average uses.
      </p>

      <Drawer
        open={selected !== null && cell !== undefined}
        onClose={() => setSelected(null)}
        title={student?.name ?? "Grade"}
        description={assignment?.title}
      >
        {selected && cell && assignment && student ? (
          <CellDetail
            key={`${selected.studentId}:${selected.assignmentId}`}
            cell={cell}
            assignment={assignment}
            student={student}
            actions={actions}
          />
        ) : null}
      </Drawer>

      {canvas ? (
        <Drawer
          open={canvasAssignment !== undefined}
          onClose={() => setCanvasColumn(null)}
          title="Canvas grade sync"
          description={canvasAssignment?.title}
        >
          {canvasAssignment ? (
            <CanvasSyncPanel
              key={canvasAssignment.id}
              assignmentId={canvasAssignment.id}
              assignmentTitle={canvasAssignment.title}
              actions={canvas.actions}
            />
          ) : null}
        </Drawer>
      ) : null}
    </>
  );
}

function CellDetail({
  cell,
  assignment,
  student,
  actions,
}: {
  cell: GridCell;
  assignment: GridAssignment;
  student: GridStudent;
  actions: GradebookActions;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [overrideResult, setOverrideResult] = useState<ActionState>({});
  const [commentResult, setCommentResult] = useState<ActionState>({});
  const [grade, setGrade] = useState(cell.override ? String(cell.override.grade) : "");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState(cell.comment ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  const ids = useMemo(
    () => ({ assignmentId: assignment.id, studentId: student.id }),
    [assignment.id, student.id],
  );
  const done = (res: ActionState, title: string) => {
    if (res.ok) toast({ title, description: res.message, tone: "good" });
    return res;
  };

  const submitOverride = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy("override");
    start(async () => {
      const res = done(await actions.setOverride({}, fd), "Override saved");
      setOverrideResult(res);
      if (res.ok) setReason("");
      setBusy(null);
    });
  };
  const clear = () => {
    setBusy("clear");
    start(async () => {
      setOverrideResult(
        done(await actions.clearOverride(ids.assignmentId, ids.studentId), "Override cleared"),
      );
      setGrade("");
      setBusy(null);
    });
  };
  const submitComment = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy("comment");
    start(async () => {
      setCommentResult(done(await actions.setComment({}, fd), "Comment saved"));
      setBusy(null);
    });
  };
  const excuse = () => {
    setBusy("excuse");
    start(async () => {
      const res = done(
        await actions.setExcused(ids.assignmentId, ids.studentId, cell.status !== "excused"),
        cell.status === "excused" ? "Excuse removed" : "Marked excused",
      );
      if (!res.ok)
        toast({ title: "Couldn't change excused status", description: res.error, tone: "bad" });
      setBusy(null);
    });
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="cd-grade">
        <h3 id="cd-grade" className="sr-only">
          Grade
        </h3>
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-3xl font-semibold tabular-nums text-ink">
            {fmt(cell.percent)}
          </p>
          <Badge tone={CELL_STATUS_TONE[cell.status]}>{STATUS_TEXT[cell.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {cell.points !== null ? `${cell.points} of ${assignment.points} points · ` : ""}
          {cell.attempts} attempt{cell.attempts === 1 ? "" : "s"}
          {cell.dueAt
            ? ` · due ${new Date(cell.dueAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`
            : ""}
        </p>
        <div className="mt-4 rounded-lg border border-line bg-surface-2 p-3">
          <p className="text-xs font-semibold text-muted">Where this grade comes from</p>
          <ul className="mt-1.5 space-y-1.5 text-sm text-ink">
            {cell.explanation.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
        {cell.override && cell.computedPercent !== null ? (
          <p className="mt-2 text-xs text-muted">
            Computed from evidence: {fmt(cell.computedPercent)}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="cd-override" className="border-t border-line pt-5">
        <h3 id="cd-override" className="font-display text-base font-semibold text-ink">
          {cell.override ? "Change override" : "Override grade"}
        </h3>
        <p className="mt-1 text-xs text-muted">
          Overrides change the recorded grade only. Student responses and mastery evidence are never
          modified.
        </p>
        <form onSubmit={submitOverride} noValidate className="mt-3 space-y-3">
          <input type="hidden" name="assignmentId" value={ids.assignmentId} />
          <input type="hidden" name="studentId" value={ids.studentId} />
          {overrideResult.error ? (
            <p
              role="alert"
              className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad"
            >
              {overrideResult.error}
            </p>
          ) : null}
          <Field
            label="Grade (%)"
            htmlFor="cd-grade-input"
            error={overrideResult.fieldErrors?.grade}
            hint="0–150 (above 100 allows extra credit)."
          >
            <Input
              id="cd-grade-input"
              name="grade"
              type="number"
              min={0}
              max={150}
              step={0.5}
              inputMode="decimal"
              className="max-w-32"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </Field>
          <Field
            label="Reason"
            htmlFor="cd-reason"
            error={overrideResult.fieldErrors?.reason}
            required
            hint="Required. Kept in the audit log with the previous value."
          >
            <Textarea
              id="cd-reason"
              name="reason"
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              loading={pending && busy === "override"}
              disabled={pending}
              loadingText="Saving…"
            >
              Save override
            </Button>
            {cell.override ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={clear}
                loading={pending && busy === "clear"}
                disabled={pending}
                loadingText="Clearing…"
              >
                Clear override
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section aria-labelledby="cd-comment" className="border-t border-line pt-5">
        <h3 id="cd-comment" className="font-display text-base font-semibold text-ink">
          Comment
        </h3>
        <form onSubmit={submitComment} noValidate className="mt-3 space-y-3">
          <input type="hidden" name="assignmentId" value={ids.assignmentId} />
          <input type="hidden" name="studentId" value={ids.studentId} />
          {commentResult.error ? (
            <p
              role="alert"
              className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad"
            >
              {commentResult.error}
            </p>
          ) : null}
          <Field
            label="Comment for this grade"
            htmlFor="cd-comment-input"
            hideLabel
            error={commentResult.fieldErrors?.comment}
            hint="Leave empty and save to remove the comment."
          >
            <Textarea
              id="cd-comment-input"
              name="comment"
              rows={3}
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            loading={pending && busy === "comment"}
            disabled={pending}
            loadingText="Saving…"
          >
            Save comment
          </Button>
        </form>
      </section>

      <section aria-labelledby="cd-excuse" className="border-t border-line pt-5">
        <h3 id="cd-excuse" className="font-display text-base font-semibold text-ink">
          Excuse
        </h3>
        <p className="mt-1 text-xs text-muted">
          Excused work is never marked missing and is left out of averages.
        </p>
        <Button
          className="mt-3"
          size="sm"
          variant="secondary"
          onClick={excuse}
          loading={pending && busy === "excuse"}
          disabled={pending}
          loadingText="Saving…"
        >
          {cell.status === "excused" ? "Remove excuse" : "Mark excused"}
        </Button>
      </section>
    </div>
  );
}
