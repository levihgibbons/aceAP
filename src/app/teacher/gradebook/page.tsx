import type { Metadata } from "next";
import { Download, Plus, Settings2, ShieldCheck, Table2 } from "lucide-react";
import { ClassPicker } from "@/components/assignments/ClassPicker";
import { CanvasClassSync } from "@/components/gradebook/CanvasClassSync";
import { GradebookGrid, type GridCanvas } from "@/components/gradebook/GradebookGrid";
import { loadGradebookView } from "@/components/gradebook/load";
import { buttonStyles, ButtonLink, EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { requireStaff } from "@/modules/auth/session";
import { listClassesForStaff } from "@/modules/classrooms/service";
import {
  getClassPassbackState,
  type PassbackBlockReason,
} from "@/modules/integrations/lms/passback";
import {
  clearOverrideAction,
  loadCanvasSyncAction,
  retryGradeSyncAction,
  sendAssignmentGradesAction,
  sendClassGradesAction,
  setCommentAction,
  setExcusedAction,
  setOverrideAction,
} from "./actions";

const CANVAS_SHORT: Record<PassbackBlockReason, string> = {
  no_connection: "no connection",
  connection_unverified: "not verified",
  assignment_not_linked: "not linked",
  line_item_unknown: "no grade column",
  students_unlinked: "students not linked",
};

export const metadata: Metadata = { title: "Gradebook" };

export default async function GradebookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStaff();
  const params = await searchParams;
  const classParam = typeof params.class === "string" ? params.class : null;
  const classes = await listClassesForStaff(user);

  if (classes.length === 0) {
    return (
      <>
        <PageHeader title="Gradebook" />
        <EmptyState
          icon={<Table2 />}
          title="No classes yet"
          description="Grades appear here once you have a class with assignments."
          action={<ButtonLink href="/teacher/classes">Go to classes</ButtonLink>}
        />
      </>
    );
  }

  const cls = classParam ? classes.find((c) => c.id === classParam) : classes[0];
  const picker = (
    <ClassPicker
      basePath="/teacher/gradebook"
      classes={classes.map((c) => ({ id: c.id, name: c.name, detail: c.courseName }))}
      value={cls?.id ?? null}
    />
  );
  if (!cls) {
    return (
      <>
        <PageHeader title="Gradebook" />
        <div className="mb-6">{picker}</div>
        <ErrorState
          title="Class not available"
          description="That class doesn't exist or isn't one of yours."
          retry={{ href: "/teacher/gradebook", label: "Open my first class" }}
        />
      </>
    );
  }

  const view = await loadGradebookView(user, cls.id);
  const { gb } = view;
  const policy = gb.policy.config;
  const passback = await getClassPassbackState(user, cls.id, { gradebook: gb });
  const canvas: GridCanvas | undefined = passback.connection
    ? {
        assignments: Object.fromEntries(
          Object.values(passback.assignments).map((e) => [
            e.assignmentId,
            { canSend: e.canSend, short: e.reason ? CANVAS_SHORT[e.reason] : "ready" },
          ]),
        ),
        actions: {
          load: loadCanvasSyncAction,
          send: sendAssignmentGradesAction,
          retry: retryGradeSyncAction,
        },
      }
    : undefined;
  const sendable = passback.sendableAssignmentIds.length;

  return (
    <>
      <PageHeader
        eyebrow={cls.courseName}
        title="Gradebook"
        description="Grades are computed from evidence — submissions and current mastery — through your grading policy. Select any grade to see exactly where it came from."
        actions={
          <>
            <ButtonLink
              variant="secondary"
              href={`/teacher/gradebook/policy?class=${cls.id}`}
              icon={<Settings2 aria-hidden="true" className="size-4" />}
            >
              Grading policy
            </ButtonLink>
            <a
              href={`/api/teacher/gradebook/export?class=${cls.id}`}
              className={buttonStyles({ variant: "secondary" })}
              download
            >
              <Download aria-hidden="true" className="size-4" />
              Export CSV
            </a>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        {picker}
        <p className="text-sm text-muted">
          Policy v{gb.policy.version || 1}: Mastered {policy.levelGrades.mastered}% · Proficient{" "}
          {policy.levelGrades.proficient}% · Approaching {policy.levelGrades.approaching}% ·
          Developing {policy.levelGrades.developing}% ·{" "}
          {policy.attemptRule === "best" ? "best" : "latest"} attempt
          {policy.latePenalty ? ` · −${policy.latePenalty} late` : ""}
        </p>
      </div>
      {view.assignments.length > 0 ? (
        <CanvasClassSync
          classId={cls.id}
          connectionLabel={
            passback.connection
              ? `${passback.connection.issuer}${passback.connection.verified ? "" : " — not verified"}`
              : null
          }
          sendableCount={sendable}
          reason={
            passback.message ??
            (sendable === 0
              ? "No assignment in this class is linked to a Canvas grade column yet. Add assignments in Canvas with the AceAP assignment picker, then open each once from Canvas as the teacher."
              : null)
          }
          showIntegrationsLink={passback.reason !== null}
          action={sendClassGradesAction}
        />
      ) : null}
      <p className="mb-5 flex items-start gap-2 rounded-lg bg-info-soft px-3.5 py-2.5 text-sm text-info">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          Overrides change the recorded grade only. Student responses and mastery evidence are never
          modified.
        </span>
      </p>
      {view.students.length === 0 || view.assignments.length === 0 ? (
        <EmptyState
          icon={<Table2 />}
          title={
            view.students.length === 0 ? "No students in this class yet" : "No assignments yet"
          }
          description={
            view.students.length === 0
              ? `Share the join code ${cls.joinCode} with your students. Their grades appear here as they work.`
              : "Create an assignment and its column appears here."
          }
          action={
            view.assignments.length === 0 ? (
              <ButtonLink
                href={`/teacher/assignments/new?class=${cls.id}`}
                icon={<Plus aria-hidden="true" className="size-4" />}
              >
                New assignment
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <GradebookGrid
          className={cls.name}
          assignments={view.assignments}
          students={view.students}
          cells={view.cells}
          averageMethod={gb.averages.method}
          actions={{
            setOverride: setOverrideAction,
            clearOverride: clearOverrideAction,
            setComment: setCommentAction,
            setExcused: setExcusedAction,
          }}
          canvas={canvas}
        />
      )}
    </>
  );
}
