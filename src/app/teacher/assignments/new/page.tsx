import type { Metadata } from "next";
import { Users } from "lucide-react";
import { AssignmentForm, type AssignmentFormData } from "@/components/assignments/AssignmentForm";
import { ButtonLink, EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { requireStaff } from "@/modules/auth/session";
import { getMasteryMatrix, getRoster } from "@/modules/classrooms/analytics";
import { listClassesForStaff } from "@/modules/classrooms/service";
import { getCourseTree } from "@/modules/curriculum/queries";
import { MASTERY_LEVELS, type MasteryLevel } from "@/modules/mastery/types";
import { createAssignmentAction } from "../actions";

export const metadata: Metadata = { title: "New assignment" };

const KINDS = ["lesson", "skill_practice", "assessment"] as const;
const idList = (v: string | string[] | undefined) =>
  typeof v === "string"
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 500)
    : [];

export default async function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStaff();
  const params = await searchParams;
  const classes = await listClassesForStaff(user);

  const header = (
    <PageHeader
      breadcrumbs={[
        { label: "Assignments", href: "/teacher/assignments" },
        { label: "New assignment" },
      ]}
      title="New assignment"
      description="Assign a lesson, targeted skill practice or a quiz to the whole class or to selected students. Every graded answer also becomes mastery evidence."
    />
  );
  if (classes.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<Users />}
          title="No classes yet"
          description="Create a class first; assignments always belong to a class."
          action={<ButtonLink href="/teacher/classes">Go to classes</ButtonLink>}
        />
      </>
    );
  }

  const classParam = typeof params.class === "string" ? params.class : null;
  const cls = classes.find((c) => c.id === classParam) ?? (classParam ? null : classes[0]);
  if (!cls) {
    return (
      <>
        {header}
        <ErrorState
          title="Class not available"
          description="That class doesn't exist or isn't one of yours."
          retry={{ href: "/teacher/assignments/new", label: "Choose another class" }}
        />
      </>
    );
  }

  const [tree, roster, matrix] = await Promise.all([
    getCourseTree(cls.courseId),
    getRoster(user, cls.id),
    getMasteryMatrix(user, cls.id, { groupBy: "skill" }),
  ]);
  if (!tree)
    return (
      <>
        {header}
        <ErrorState
          description="This class's course could not be loaded."
          retry={{ href: "/teacher/assignments", label: "Back to assignments" }}
        />
      </>
    );

  const distribution = new Map(matrix.columns.map((c) => [c.id, c.distribution]));
  const emptyDist = Object.fromEntries(MASTERY_LEVELS.map((l) => [l, 0])) as Record<
    MasteryLevel,
    number
  >;

  const data: AssignmentFormData = {
    classes: classes.map((c) => ({ id: c.id, name: c.name, detail: c.courseName })),
    classId: cls.id,
    courseName: tree.course.name,
    lessons: tree.units
      .map((u) => ({
        unit: `Unit ${u.number}: ${u.title}`,
        lessons: u.topics
          .flatMap((tp) => tp.lessons)
          .map((l) => ({
            id: l.id,
            title: l.title,
            minutes: l.estMinutes,
            published: l.publishedVersion !== null,
          })),
      }))
      .filter((g) => g.lessons.length > 0),
    objectives: tree.units.flatMap((u) =>
      u.topics.flatMap((tp) =>
        tp.objectives
          .filter((o) => o.skillIds.length > 0)
          .map((o) => ({
            id: o.id,
            code: o.code,
            description: o.description,
            unit: `Unit ${u.number}`,
            skills: o.skillIds.map((sid) => ({
              id: sid,
              name: tree.skills.get(sid)?.name ?? sid,
              questionCount: tree.skills.get(sid)?.questionCount ?? 0,
              distribution: distribution.get(sid) ?? { ...emptyDist, not_started: roster.length },
            })),
          })),
      ),
    ),
    assessments: tree.assessments
      .filter((a) => a.kind !== "exam_practice" && a.questionCount > 0)
      .map((a) => ({
        id: a.id,
        title: a.title,
        kind: a.kind,
        questionCount: a.questionCount,
        timeLimitMinutes: a.timeLimitSeconds ? Math.round(a.timeLimitSeconds / 60) : null,
      })),
    roster: roster.map((s) => ({ id: s.id, name: s.name })),
    prefill: {
      kind:
        KINDS.find((k) => k === params.kind) ??
        (typeof params.lesson === "string"
          ? "lesson"
          : typeof params.assessment === "string"
            ? "assessment"
            : "skill_practice"),
      skillIds: idList(params.skills).filter((id) => tree.skills.has(id)),
      studentIds: idList(params.students).filter((id) => roster.some((s) => s.id === id)),
      lessonId:
        typeof params.lesson === "string" && tree.lessons.has(params.lesson) ? params.lesson : null,
      assessmentId:
        typeof params.assessment === "string" &&
        tree.assessments.some((a) => a.id === params.assessment)
          ? params.assessment
          : null,
    },
    ignoredPrefill:
      idList(params.skills).some((id) => !tree.skills.has(id)) ||
      idList(params.students).some((id) => !roster.some((s) => s.id === id)) ||
      (typeof params.lesson === "string" && !tree.lessons.has(params.lesson)) ||
      (typeof params.assessment === "string" &&
        !tree.assessments.some((a) => a.id === params.assessment)),
  };

  return (
    <>
      {header}
      <AssignmentForm key={cls.id} data={data} action={createAssignmentAction} />
    </>
  );
}
