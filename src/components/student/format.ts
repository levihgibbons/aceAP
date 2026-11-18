/**
 * Small presentation helpers shared by the student pages. Pure functions —
 * no data access, no React.
 */
import type { AttemptMode, MisconceptionStatus } from "@/db/schema";
import type { BadgeTone } from "@/components/ui";
import { formatDate, formatRelativeTime } from "@/components/ui";

/** 0..1 → "42%". */
export const pct = (n: number) => `${Math.round((Number.isFinite(n) ? n : 0) * 100)}%`;

export const MODE_LABEL: Record<AttemptMode, string> = {
  lesson_check: "Lesson check",
  guided_practice: "Guided practice",
  skill_quiz: "Skill quiz",
  lesson_quiz: "Lesson quiz",
  unit_test: "Unit test",
  course_review: "Review",
  exam_practice: "Exam practice",
  custom: "Teacher set",
};

export const ASSESSMENT_KIND_LABEL: Record<string, string> = {
  skill_quiz: "Skill quiz",
  lesson_quiz: "Lesson quiz",
  unit_test: "Unit test",
  exam_practice: "Exam practice set",
  custom: "Custom set",
};

export const MISCONCEPTION_STATUS: Record<
  MisconceptionStatus,
  { label: string; tone: BadgeTone; hint: string }
> = {
  hypothesis: { label: "Open", tone: "warn", hint: "Suggested by your answers. Not confirmed." },
  teacher_confirmed: {
    label: "Confirmed by teacher",
    tone: "bad",
    hint: "Your teacher confirmed this pattern.",
  },
  potentially_resolved: {
    label: "Potentially resolved",
    tone: "info",
    hint: "You've answered correctly since it last appeared.",
  },
  resolved: {
    label: "Resolved",
    tone: "good",
    hint: "Several correct answers since it last appeared.",
  },
};

export const isOpenMisconception = (s: MisconceptionStatus) =>
  s === "hypothesis" || s === "teacher_confirmed";

export interface DueInfo {
  /** "Due in 3 days", "Past due", "No due date". */
  label: string;
  /** "Nov 20, 2026, 11:59 PM" or null. */
  absolute: string | null;
  tone: BadgeTone;
  overdue: boolean;
}

export function dueInfo(dueAt: Date | null, now: Date = new Date()): DueInfo {
  if (!dueAt) return { label: "No due date", absolute: null, tone: "neutral", overdue: false };
  const ms = dueAt.getTime() - now.getTime();
  const absolute = formatDate(dueAt, { withTime: true, short: true });
  if (ms < 0)
    return {
      label: `Was due ${formatRelativeTime(dueAt, now)}`,
      absolute,
      tone: "bad",
      overdue: true,
    };
  const days = ms / 86_400_000;
  return {
    label: `Due ${formatRelativeTime(dueAt, now)}`,
    absolute,
    tone: days < 2 ? "warn" : "neutral",
    overdue: false,
  };
}

/** Score as "8/10 (80%)". */
export function scoreText(score: number | null, maxScore: number | null): string | null {
  if (score === null || !maxScore) return null;
  const round = (x: number) => Math.round(x * 10) / 10;
  return `${round(score)}/${round(maxScore)} (${Math.round((score / maxScore) * 100)}%)`;
}

/** First name for greetings ("Avery Brooks" → "Avery"). */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export const REVIEW_REASON_TEXT: Record<
  "scheduled_review_due" | "recent_misses" | "dropped_below_proficient",
  string
> = {
  scheduled_review_due:
    "A spaced review is due. A few correct answers will confirm you still know this.",
  recent_misses: "At least 2 of your last 3 answers without help were incorrect.",
  dropped_below_proficient:
    "You were Proficient before, but later answers brought this below Proficient.",
};
