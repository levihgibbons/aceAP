/**
 * Deterministic "what should I study next?" engine. Pure function of the
 * student's learning record — it works with the AI tutor switched off, every
 * recommendation carries its reason, and nothing here ever locks content.
 */
import { LEVEL_LABEL, LEVEL_RANK, type MasteryLevel, type SkillExplanation } from "@/modules/mastery/types";

export interface RecSkill {
  id: string;
  name: string;
  prerequisites: string[];
  lessonIds: string[];
  patternLabels: Record<string, string>;
  questionCount: number;
}

export interface RecState {
  level: MasteryLevel;
  needsReview: boolean;
  explanation: SkillExplanation;
}

export interface RecInput {
  now: Date;
  courseId: string;
  courseName: string;
  /** Lessons in guided-path order. */
  lessons: { id: string; title: string; skillIds: string[] }[];
  lessonStatus: Map<string, "in_progress" | "completed">;
  skills: Map<string, RecSkill>;
  states: Map<string, RecState>;
  reviewsDue: { skillId: string; dueAt: Date }[];
  misconceptions: { skillId: string; misconceptionId: string; title: string; remediation: string; status: string; occurrences: number }[];
  assignments: { id: string; title: string; dueAt: Date | null; kind: string; done: boolean; href: string }[];
  assessments: { id: string; title: string; kind: string; skillIds: string[]; taken: boolean }[];
}

export type RecKind = "assignment" | "misconception" | "prerequisite_gap" | "review" | "continue_lesson" | "struggling_skill" | "next_lesson" | "practice_to_level_up" | "take_assessment";

export interface Recommendation {
  id: string;
  kind: RecKind;
  title: string;
  /** Why this is being suggested — always shown to the student. */
  reason: string;
  href: string;
  cta: string;
  skillId?: string;
  /** Optional short sequence (e.g. refresher → worked example → practice). */
  steps?: { label: string; href: string }[];
  priority: number;
}

const lessonHref = (id: string) => `/app/learn/${id}`;
const practiceHref = (skillId: string) => `/app/practice/${skillId}`;
const rank = (s: RecState | undefined) => LEVEL_RANK[s?.level ?? "not_started"];
const misses = (s: RecState | undefined) => (s ? s.explanation.independentAttempts - s.explanation.independentCorrect : 0);

function daysUntil(due: Date, now: Date) {
  return (due.getTime() - now.getTime()) / 86_400_000;
}

export function recommend(input: RecInput): Recommendation[] {
  const out: Recommendation[] = [];
  const { skills, states, lessons, lessonStatus, now } = input;
  const firstLessonFor = (skillId: string) => {
    const ids = skills.get(skillId)?.lessonIds ?? [];
    return lessons.find((l) => ids.includes(l.id)) ?? null;
  };
  const covered = new Set<string>();
  const add = (r: Recommendation) => {
    if (r.skillId) {
      if (covered.has(r.skillId)) return;
      covered.add(r.skillId);
    }
    out.push(r);
  };

  // 1 ─ Teacher assignments come first, most urgent first.
  for (const a of input.assignments.filter((x) => !x.done)) {
    const d = a.dueAt ? daysUntil(a.dueAt, now) : null;
    const when = d === null ? "No due date" : d < 0 ? "Past due" : d < 1 ? "Due today" : d < 2 ? "Due tomorrow" : `Due in ${Math.floor(d)} days`;
    out.push({ id: `assignment:${a.id}`, kind: "assignment", title: a.title, reason: `${when} — assigned by your teacher.`, href: a.href, cta: "Open assignment", priority: 1000 - Math.max(-5, Math.min(d ?? 30, 30)) });
  }

  // 2 ─ A recurring (or teacher-confirmed) misconception gets targeted remediation.
  for (const m of input.misconceptions) {
    const open = m.status === "hypothesis" || m.status === "teacher_confirmed";
    if (!open || (m.occurrences < 2 && m.status !== "teacher_confirmed")) continue;
    const skill = skills.get(m.skillId);
    if (!skill) continue;
    const lesson = firstLessonFor(m.skillId);
    add({
      id: `misconception:${m.misconceptionId}`,
      kind: "misconception",
      title: `Fix a recurring mistake in ${skill.name}`,
      reason: `${m.status === "teacher_confirmed" ? "Your teacher confirmed" : `${m.occurrences} of your answers suggest`} this pattern: ${m.title.toLowerCase()}. ${m.remediation}`,
      href: practiceHref(m.skillId),
      cta: "Practise this",
      skillId: m.skillId,
      steps: [...(lesson ? [{ label: `Re-read: ${lesson.title}`, href: lessonHref(lesson.id) }] : []), { label: `Targeted practice: ${skill.name}`, href: practiceHref(m.skillId) }],
      priority: 900 + Math.min(m.occurrences, 10),
    });
  }

  // 3 ─ Struggling on a skill whose prerequisite isn't solid → fix the prerequisite first.
  for (const [skillId, state] of states) {
    const skill = skills.get(skillId);
    if (!skill || rank(state) >= LEVEL_RANK.proficient || misses(state) < 2) continue;
    const weakPrereq = skill.prerequisites.map((p) => ({ id: p, skill: skills.get(p), state: states.get(p) })).find((p) => p.skill && rank(p.state) < LEVEL_RANK.proficient);
    if (!weakPrereq?.skill) continue;
    const refresher = firstLessonFor(weakPrereq.id);
    const pre = weakPrereq.skill;
    add({
      id: `prereq:${skillId}:${weakPrereq.id}`,
      kind: "prerequisite_gap",
      title: `Strengthen ${pre.name} first`,
      reason: `You've missed ${misses(state)} questions on ${skill.name}, which builds on ${pre.name} — ${weakPrereq.state ? `currently ${LEVEL_LABEL[weakPrereq.state.level].toLowerCase()}` : "not yet practised"}. A short refresher there should make ${skill.name} easier.`,
      href: refresher ? lessonHref(refresher.id) : practiceHref(weakPrereq.id),
      cta: refresher ? "Start refresher" : "Practise prerequisite",
      skillId,
      steps: [
        ...(refresher ? [{ label: `Refresher: ${refresher.title}`, href: lessonHref(refresher.id) }] : []),
        { label: `Practice: ${pre.name}`, href: practiceHref(weakPrereq.id) },
        { label: `Then retry: ${skill.name}`, href: practiceHref(skillId) },
      ],
      priority: 850 + misses(state),
    });
    covered.add(weakPrereq.id);
  }

  // 4 ─ Spaced review that has come due, or a skill flagged by recent misses.
  const reviewSkills = [...new Set([...input.reviewsDue.filter((r) => r.dueAt.getTime() <= now.getTime()).map((r) => r.skillId), ...[...states].filter(([, s]) => s.needsReview).map(([id]) => id)])].filter(
    (id) => skills.has(id) && !covered.has(id),
  );
  if (reviewSkills.length) {
    const names = reviewSkills.slice(0, 3).map((id) => skills.get(id)!.name);
    out.push({
      id: `review:${input.courseId}`,
      kind: "review",
      title: `Review ${reviewSkills.length} skill${reviewSkills.length === 1 ? "" : "s"} to keep ${reviewSkills.length === 1 ? "it" : "them"} fresh`,
      reason: `${names.join(", ")}${reviewSkills.length > 3 ? ` and ${reviewSkills.length - 3} more` : ""}: it's been a while, or recent answers slipped. A few quick questions will confirm what you still know — your mastery doesn't drop just because time passed.`,
      href: `/app/review/${input.courseId}`,
      cta: "Start review",
      priority: 800,
    });
    for (const id of reviewSkills) covered.add(id);
  }

  // 5 ─ Resume a lesson that was started but not finished.
  const inProgress = lessons.find((l) => lessonStatus.get(l.id) === "in_progress");
  if (inProgress) out.push({ id: `continue:${inProgress.id}`, kind: "continue_lesson", title: inProgress.title, reason: "You started this lesson and haven't finished it.", href: lessonHref(inProgress.id), cta: "Resume lesson", priority: 700 });

  // 6 ─ Struggling without a prerequisite gap → revisit the lesson, then targeted practice.
  for (const [skillId, state] of states) {
    const skill = skills.get(skillId);
    if (!skill || covered.has(skillId) || rank(state) >= LEVEL_RANK.proficient || misses(state) < 2) continue;
    const lesson = firstLessonFor(skillId);
    const weak = state.explanation.weakestPattern ? (skill.patternLabels[state.explanation.weakestPattern] ?? null) : null;
    add({
      id: `struggling:${skillId}`,
      kind: "struggling_skill",
      title: `More practice on ${skill.name}`,
      reason: `${state.explanation.independentCorrect} of ${state.explanation.independentAttempts} answers correct without help so far${weak ? `; ${weak.toLowerCase()} is the weakest area` : ""}.`,
      href: practiceHref(skillId),
      cta: "Practise",
      skillId,
      steps: [...(lesson ? [{ label: `Review: ${lesson.title}`, href: lessonHref(lesson.id) }] : []), { label: `Practice: ${skill.name}`, href: practiceHref(skillId) }],
      priority: 650 + misses(state),
    });
  }

  // 7 ─ Otherwise, the next lesson on the guided path.
  const next = lessons.find((l) => !lessonStatus.has(l.id));
  if (next && !inProgress) {
    const started = lessonStatus.size > 0 || states.size > 0;
    out.push({ id: `next:${next.id}`, kind: "next_lesson", title: next.title, reason: started ? "Next lesson in the course sequence." : `Start ${input.courseName} here.`, href: lessonHref(next.id), cta: started ? "Start lesson" : "Begin", priority: 600 });
  }

  // 8 ─ A quiz or test whose skills have been practised but that hasn't been taken.
  for (const a of input.assessments) {
    if (a.taken || a.kind === "exam_practice") continue;
    const practised = a.skillIds.filter((s) => states.has(s)).length;
    if (a.skillIds.length === 0 || practised / a.skillIds.length < 0.6) continue;
    out.push({
      id: `assessment:${a.id}`,
      kind: "take_assessment",
      title: a.title,
      reason: "You've practised most of what this covers. A quiz taken without hints is the strongest evidence of what you know.",
      href: `/app/assessments/${a.id}`,
      cta: "Take it",
      priority: 550,
    });
  }

  // 9 ─ Skills that are close to the next level.
  const close = [...states]
    .filter(([id, s]) => skills.has(id) && !covered.has(id) && !s.needsReview && s.level !== "mastered" && s.level !== "not_started" && s.explanation.unmet.length > 0 && s.explanation.unmet.length <= 2)
    .sort((a, b) => rank(b[1]) - rank(a[1]));
  for (const [skillId, s] of close.slice(0, 3)) {
    const skill = skills.get(skillId)!;
    if (skill.questionCount === 0) continue;
    add({
      id: `levelup:${skillId}`,
      kind: "practice_to_level_up",
      title: `${skill.name}: close to ${s.explanation.nextLevel ? LEVEL_LABEL[s.explanation.nextLevel] : "the next level"}`,
      reason: `Still needed: ${s.explanation.unmet.join("; ")}.`,
      href: practiceHref(skillId),
      cta: "Practise",
      skillId,
      priority: 500 + rank(s) * 5,
    });
  }

  return out.sort((a, b) => b.priority - a.priority);
}
