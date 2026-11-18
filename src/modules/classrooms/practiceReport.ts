/**
 * "Lessons & practice" — how a class is handling each step of a unit's guided
 * path: every lesson (opened, finished, how the inline checks went) and every
 * exercise, quiz and test (who has tried it, best scores, tries, estimated
 * active time, who is struggling, and which misconceptions the answers show).
 *
 * Read under row-level security (`asUser`): a teacher sees only students
 * actively enrolled in a class they teach, for that class's course.
 * Active time is the idle-excluding estimate; it is never evidence of learning.
 */
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { asUser, getDb, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { unitPath } from "@/modules/curriculum/path";
import { getCourseTree, type UnitNode } from "@/modules/curriculum/queries";
import { getRoster } from "./analytics";
import { assertClassStaff, type StaffUser } from "./service";

/** Best score below this share of the maximum counts as struggling. */
export const STRUGGLING_BELOW = 0.6;

export interface StudentStepRow {
  studentId: string;
  name: string;
  status: "not_started" | "started" | "done";
  /** Assessments: best score as a share of the maximum. Lessons: share of inline checks right on the first try. */
  best: number | null;
  attempts: number;
  activeMs: number;
  lastAt: Date | null;
}

export interface StepReport {
  id: string;
  type: "lesson" | "assessment";
  kind: string;
  title: string;
  number: string | null;
  topicTitle: string | null;
  students: number;
  /** Lessons: opened. Assessments: submitted at least once. */
  started: number;
  /** Lessons: finished. Assessments: best score ≥ 80%. */
  done: number;
  attempts: number;
  /** Mean of each student's best (assessments) or first-try check accuracy (lessons); null with no data. */
  averageBest: number | null;
  medianActiveMs: number | null;
  struggling: { studentId: string; name: string; best: number }[];
  misconceptions: { id: string; title: string; students: number; responses: number }[];
  perStudent: StudentStepRow[];
}

export interface UnitPracticeReport {
  classId: string;
  courseId: string;
  units: { id: string; number: number; title: string; available: boolean }[];
  unit: UnitNode | null;
  students: { id: string; name: string }[];
  steps: StepReport[];
}

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export async function getUnitPracticeReport(user: StaffUser, classId: string, unitId?: string): Promise<UnitPracticeReport> {
  const db = await getDb();
  const cls = await assertClassStaff(db, user, classId);
  const tree = await getCourseTree(cls.courseId);
  if (!tree) throw new DomainError("not_found", "Course not found.");
  const units = tree.units.map((u) => ({ id: u.id, number: u.number, title: u.title, available: u.status === "available" }));
  const unit = tree.units.find((u) => u.id === unitId && u.status === "available") ?? tree.units.find((u) => u.status === "available") ?? null;
  const roster = await getRoster(user, classId);
  const students = roster.map((s) => ({ id: s.id, name: s.name }));
  if (!unit) return { classId, courseId: cls.courseId, units, unit: null, students, steps: [] };

  const sections = unitPath(tree, unit);
  const lessonIds = sections.flatMap((s) => s.items.flatMap((i) => (i.type === "lesson" ? [i.lesson.id] : [])));
  const assessmentIds = sections.flatMap((s) => s.items.flatMap((i) => (i.type === "assessment" ? [i.assessment.id] : [])));
  const ids = students.map((s) => s.id);

  const data = ids.length
    ? await asUser(user as Actor, async (tx) => {
        const progress = lessonIds.length
          ? await tx
              .select({ userId: t.lessonProgress.userId, lessonId: t.lessonProgress.lessonId, status: t.lessonProgress.status, updatedAt: t.lessonProgress.updatedAt })
              .from(t.lessonProgress)
              .where(and(eq(t.lessonProgress.courseId, cls.courseId), inArray(t.lessonProgress.userId, ids), inArray(t.lessonProgress.lessonId, lessonIds)))
          : [];
        const attempts = await tx
          .select({
            id: t.attempts.id,
            userId: t.attempts.userId,
            assessmentId: t.attempts.assessmentId,
            lessonId: t.attempts.lessonId,
            mode: t.attempts.mode,
            status: t.attempts.status,
            score: t.attempts.score,
            maxScore: t.attempts.maxScore,
            submittedAt: t.attempts.submittedAt,
            startedAt: t.attempts.startedAt,
          })
          .from(t.attempts)
          .where(and(eq(t.attempts.courseId, cls.courseId), inArray(t.attempts.userId, ids)));
        const attemptIds = attempts
          .filter((a) => (a.assessmentId && assessmentIds.includes(a.assessmentId)) || (a.lessonId && lessonIds.includes(a.lessonId)))
          .map((a) => a.id);
        const responses = attemptIds.length
          ? await tx
              .select({ attemptId: t.questionResponses.attemptId, userId: t.questionResponses.userId, isCorrect: t.questionResponses.isCorrect, tryNumber: t.questionResponses.tryNumber, misconceptionId: t.questionResponses.misconceptionId })
              .from(t.questionResponses)
              .where(inArray(t.questionResponses.attemptId, attemptIds))
          : [];
        const sessionIds = [...lessonIds, ...attemptIds];
        const sessions = sessionIds.length
          ? await tx
              .select({ userId: t.learningSessions.userId, activityId: t.learningSessions.activityId, activeMs: t.learningSessions.activeMs })
              .from(t.learningSessions)
              .where(and(eq(t.learningSessions.courseId, cls.courseId), inArray(t.learningSessions.userId, ids), isNotNull(t.learningSessions.activityId), inArray(t.learningSessions.activityId, sessionIds)))
          : [];
        return { progress, attempts, responses, sessions };
      })
    : { progress: [], attempts: [], responses: [], sessions: [] };

  const activeBy = new Map<string, number>(); // `${userId}:${activityId}` → ms
  for (const s of data.sessions) {
    const k = `${s.userId}:${s.activityId}`;
    activeBy.set(k, (activeBy.get(k) ?? 0) + s.activeMs);
  }

  const misconceptionsFor = (attemptIdsForStep: Set<string>) => {
    const byMis = new Map<string, { students: Set<string>; responses: number }>();
    for (const r of data.responses) {
      if (!r.misconceptionId || !attemptIdsForStep.has(r.attemptId)) continue;
      const e = byMis.get(r.misconceptionId) ?? { students: new Set<string>(), responses: 0 };
      e.students.add(r.userId);
      e.responses += 1;
      byMis.set(r.misconceptionId, e);
    }
    return [...byMis.entries()]
      .map(([id, e]) => ({ id, title: tree.misconceptions.get(id)?.title ?? id, students: e.students.size, responses: e.responses }))
      .sort((a, b) => b.students - a.students || b.responses - a.responses)
      .slice(0, 3);
  };

  const steps: StepReport[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      if (item.type === "lesson") {
        const l = item.lesson;
        const checkAttempts = data.attempts.filter((a) => a.lessonId === l.id && a.mode === "lesson_check");
        const checkIds = new Set(checkAttempts.map((a) => a.id));
        const perStudent: StudentStepRow[] = students.map((s) => {
          const p = data.progress.find((x) => x.userId === s.id && x.lessonId === l.id);
          const first = data.responses.filter((r) => r.userId === s.id && checkIds.has(r.attemptId) && r.tryNumber === 1);
          return {
            studentId: s.id,
            name: s.name,
            status: p?.status === "completed" ? "done" : p ? "started" : "not_started",
            best: first.length ? first.filter((r) => r.isCorrect).length / first.length : null,
            attempts: checkAttempts.filter((a) => a.userId === s.id).length,
            activeMs: activeBy.get(`${s.id}:${l.id}`) ?? 0,
            lastAt: p?.updatedAt ?? null,
          };
        });
        const opened = perStudent.filter((r) => r.status !== "not_started");
        steps.push({
          id: l.id,
          type: "lesson",
          kind: "lesson",
          title: l.title,
          number: item.number,
          topicTitle: section.topic?.title ?? null,
          students: students.length,
          started: opened.length,
          done: perStudent.filter((r) => r.status === "done").length,
          attempts: opened.length,
          averageBest: mean(perStudent.flatMap((r) => (r.best === null ? [] : [r.best]))),
          medianActiveMs: median(opened.map((r) => r.activeMs).filter((ms) => ms > 0)),
          struggling: perStudent.filter((r) => r.best !== null && r.best < STRUGGLING_BELOW).map((r) => ({ studentId: r.studentId, name: r.name, best: r.best! })),
          misconceptions: misconceptionsFor(checkIds),
          perStudent,
        });
      } else {
        const a = item.assessment;
        const mine = data.attempts.filter((x) => x.assessmentId === a.id);
        const submitted = mine.filter((x) => x.status === "submitted" && x.maxScore && x.maxScore > 0);
        const ids4 = new Set(mine.map((x) => x.id));
        const perStudent: StudentStepRow[] = students.map((s) => {
          const theirs = mine.filter((x) => x.userId === s.id);
          const done = submitted.filter((x) => x.userId === s.id);
          const best = done.length ? Math.max(...done.map((x) => (x.score ?? 0) / (x.maxScore ?? 1))) : null;
          const last = theirs.map((x) => x.submittedAt ?? x.startedAt).sort((p, q) => q.getTime() - p.getTime())[0] ?? null;
          return {
            studentId: s.id,
            name: s.name,
            status: done.length ? "done" : theirs.length ? "started" : "not_started",
            best,
            attempts: done.length,
            activeMs: theirs.reduce((n, x) => n + (activeBy.get(`${s.id}:${x.id}`) ?? 0), 0),
            lastAt: last,
          };
        });
        const tried = perStudent.filter((r) => r.best !== null);
        steps.push({
          id: a.id,
          type: "assessment",
          kind: a.kind,
          title: a.title,
          number: null,
          topicTitle: section.topic?.title ?? null,
          students: students.length,
          started: tried.length,
          done: tried.filter((r) => (r.best ?? 0) >= 0.8).length,
          attempts: submitted.length,
          averageBest: mean(tried.map((r) => r.best!)),
          medianActiveMs: median(perStudent.map((r) => r.activeMs).filter((ms) => ms > 0)),
          struggling: tried.filter((r) => r.best! < STRUGGLING_BELOW).map((r) => ({ studentId: r.studentId, name: r.name, best: r.best! })),
          misconceptions: misconceptionsFor(ids4),
          perStudent,
        });
      }
    }
  }
  return { classId, courseId: cls.courseId, units, unit, students, steps };
}
