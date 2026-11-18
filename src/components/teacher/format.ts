/**
 * Pure helpers shared by teacher pages and components (server and client).
 * No React, no I/O.
 */
import type { ActivityKind, AiPolicy, AttemptMode, MisconceptionStatus } from "@/db/schema";
import { LEVEL_RANK, type MasteryLevel } from "@/modules/mastery/types";

export const MODE_LABEL: Record<AttemptMode, string> = {
  lesson_check: "Lesson check",
  guided_practice: "Practice",
  skill_quiz: "Skill quiz",
  lesson_quiz: "Lesson quiz",
  unit_test: "Unit test",
  course_review: "Mixed review",
  exam_practice: "Exam practice",
  custom: "Teacher assessment",
};

export const SUMMATIVE: ReadonlySet<string> = new Set(["skill_quiz", "lesson_quiz", "unit_test", "course_review", "exam_practice", "custom"]);

export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  lesson: "Lessons",
  practice: "Practice",
  assessment: "Assessments",
  simulation: "Simulations",
};

export const ACTIVITY_KINDS: ActivityKind[] = ["lesson", "practice", "assessment", "simulation"];

export const MISCONCEPTION_STATUS: Record<MisconceptionStatus, { label: string; description: string }> = {
  hypothesis: { label: "Possible misconception", description: "Suggested by the pattern of wrong answers. Not confirmed by a teacher." },
  teacher_confirmed: { label: "Teacher-confirmed", description: "A teacher confirmed this misconception." },
  potentially_resolved: { label: "Possibly resolved", description: "At least 2 independent correct answers since it was last seen." },
  resolved: { label: "Resolved", description: "At least 4 independent correct answers since it was last seen." },
};

export const REVIEW_REASON: Record<string, string> = {
  scheduled_review_due: "a scheduled spaced review is due",
  recent_misses: "recent independent answers were missed",
  dropped_below_proficient: "later evidence dropped below Proficient",
};

export const AI_POLICY: Record<AiPolicy, { label: string; description: string }> = {
  allowed: {
    label: "Allowed",
    description: "Students can use authored hints and the AI tutor during ordinary lessons and practice. Help used before an answer counts for less in mastery.",
  },
  hints_only: {
    label: "Hints only",
    description: "Students can reveal authored hints, but the AI tutor is turned off for this class.",
  },
  disabled: {
    label: "Disabled",
    description: "No hints and no AI tutor during ordinary learning. Students work fully independently.",
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  arts: "Arts",
  english: "English",
  "history-social-science": "History & social science",
  "math-cs": "Math & computer science",
  sciences: "Sciences",
  "world-languages": "World languages & cultures",
  capstone: "AP Capstone",
  "career-kickstart": "Career Kickstart",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** How a teacher should read one mastery cell (see analysis.ts readCell). */
export type CellReading =
  /** No graded work on any skill in the column. */
  | "no_evidence"
  /** A tested skill is below Proficient and its answers are mostly wrong. */
  | "difficulty"
  /** Tested skills are below Proficient, but answers so far are mostly correct — too little evidence to call. */
  | "emerging"
  /** Every tested skill is Proficient+, but some skills are untested. */
  | "partial"
  /** Proficient+ and flagged for review. */
  | "review"
  | "on_track";

export const READING_LABEL: Record<CellReading, string> = {
  no_evidence: "Not enough evidence yet",
  difficulty: "Evidence shows difficulty",
  emerging: "Mostly correct so far — needs more evidence",
  partial: "Partly tested — tested skills look secure",
  review: "Needs review",
  on_track: "On track",
};

export const isProficient = (level: MasteryLevel) => LEVEL_RANK[level] >= LEVEL_RANK.proficient;

export function percent(n: number, d: number): string {
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

/** "2026-11-04" (UTC day) → "Nov 4". */
export function dayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? day : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(d);
}

function query(params: Record<string, string | string[] | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const s = Array.isArray(v) ? v.join(",") : v;
    if (s !== "") q.set(k, s);
  }
  const out = q.toString();
  return out ? `?${out}` : "";
}

/** Prefilled new-assignment link (supported by the assignments area). */
export function newAssignmentHref(opts: {
  classId: string;
  kind?: "skill_practice" | "assessment" | "lesson";
  skills?: string[];
  students?: string[];
  assessment?: string;
}): string {
  return `/teacher/assignments/new${query({
    class: opts.classId,
    kind: opts.kind ?? "skill_practice",
    skills: opts.skills,
    students: opts.students,
    assessment: opts.assessment,
  })}`;
}

export const classHref = (classId: string, section?: string) => `/teacher/classes/${classId}${section ? `/${section}` : ""}`;
export const interventionHref = (classId: string, columnId: string) => `/teacher/classes/${classId}/interventions${query({ column: columnId })}`;
export const studentHref = (studentId: string, classId?: string) => `/teacher/students/${studentId}${query({ class: classId })}`;
export const skillEvidenceHref = (studentId: string, skillId: string, classId?: string) =>
  `/teacher/students/${studentId}/skills/${encodeURIComponent(skillId)}${query({ class: classId })}`;

export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
