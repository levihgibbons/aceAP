/**
 * Builds the teacher EVIDENCE VIEW for one heatmap cell (objective or skill)
 * or one skill: level + plain-language explanation, what evidence is present
 * and missing, the actual responses with correct answers, misconceptions
 * (hypothesis vs teacher-confirmed) and a recommended instructional action.
 *
 * Callers MUST authorise the teacher for the student first (class roster or
 * classesSharedWithStudent): getSkillDetail reads through RLS, so an
 * unauthorised read returns empty evidence rather than an error.
 */
import "server-only";
import { inArray } from "drizzle-orm";
import { getDb, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import type { QuestionBody } from "@/modules/content/schema";
import type { CourseTree } from "@/modules/curriculum/queries";
import { getRoster } from "@/modules/classrooms/analytics";
import { assertClassStaff, type StaffUser } from "@/modules/classrooms/service";
import { getCourseTree } from "@/modules/curriculum/queries";
import { getSkillDetail, type EvidenceView } from "@/modules/learning/overview";
import { rollup, type SkillStateLite } from "@/modules/mastery/aggregation";
import { LEVEL_LABEL, LEVEL_RANK, type MasteryLevel } from "@/modules/mastery/types";
import { describeCorrectAnswer } from "@/modules/assessments/grading";
import { WEAK_ESTIMATE } from "../analysis";
import { MODE_LABEL, REVIEW_REASON, SUMMATIVE } from "../format";
import type { CellEvidence, EvidenceAssessmentResult, Recommendation, SkillEvidence } from "../types";
import { studentStates } from "./data";

type StateMap = Map<string, SkillStateLite>;

// ───────────────────────────── answer formatting ─────────────────────────────

function formatAnswer(body: QuestionBody | undefined, response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const r = response as Record<string, unknown>;
  const choiceText = (id: unknown) => {
    if (typeof id !== "string") return "?";
    if (body && (body.type === "multiple_choice" || body.type === "multi_select")) return body.choices.find((c) => c.id === id)?.text ?? id;
    return id;
  };
  switch (r.type) {
    case "multiple_choice":
      return choiceText(r.choiceId);
    case "multi_select":
      return Array.isArray(r.choiceIds) && r.choiceIds.length ? r.choiceIds.map(choiceText).join("; ") : "(nothing selected)";
    case "numeric":
      return typeof r.value === "string" || typeof r.value === "number" ? `${r.value}${body?.type === "numeric" && body.unit ? ` ${body.unit}` : ""}` : null;
    case "expression":
      return typeof r.value === "string" ? `\`${r.value}\`` : null;
    case "ordering": {
      if (!Array.isArray(r.order)) return null;
      const items = body?.type === "ordering" ? body.items : [];
      return r.order.map((id) => items.find((i) => i.id === id)?.text ?? String(id)).join(" → ");
    }
    case "matching": {
      if (!r.pairs || typeof r.pairs !== "object") return null;
      const pairs = r.pairs as Record<string, string>;
      if (body?.type !== "matching") return Object.entries(pairs).map(([a, b]) => `${a} ↔ ${b}`).join("; ");
      return body.left.map((l) => `${l.text} ↔ ${body.right.find((x) => x.id === pairs[l.id])?.text ?? "—"}`).join("; ");
    }
    case "short_response":
      return typeof r.text === "string" ? r.text : null;
    default:
      return null;
  }
}

async function questionBodies(evidence: EvidenceView[]): Promise<Map<string, QuestionBody>> {
  const ids = [...new Set(evidence.map((e) => e.questionId))];
  if (ids.length === 0) return new Map();
  const db = await getDb();
  // Shared curriculum; the evidence rows were already authorised through RLS.
  const versions = await db.select({ questionId: t.questionVersions.questionId, version: t.questionVersions.version, body: t.questionVersions.body }).from(t.questionVersions).where(inArray(t.questionVersions.questionId, ids));
  const out = new Map<string, QuestionBody>();
  for (const e of evidence) {
    const key = `${e.questionId}:${e.correctAnswer ?? ""}`;
    if (out.has(key)) continue;
    const candidates = versions.filter((v) => v.questionId === e.questionId).sort((a, b) => b.version - a.version);
    const match = candidates.find((v) => e.correctAnswer !== undefined && describeCorrectAnswer(v.body) === e.correctAnswer) ?? candidates[0];
    if (match) out.set(key, match.body);
  }
  return out;
}

function assistanceOf(e: EvidenceView): string[] {
  const out: string[] = [];
  if (e.tryNumber > 1) out.push("retry after feedback");
  if (e.hintsUsed === 1) out.push("1 hint");
  if (e.hintsUsed > 1) out.push(`${e.hintsUsed} hints`);
  if (e.solutionViewed) out.push("viewed solution");
  if (e.tutorUsed) out.push("AI tutor");
  return out;
}

// ───────────────────────────── recommendations ───────────────────────────────

function recommendForSkill(s: Omit<SkillEvidence, "recommendation">, tree: CourseTree): Recommendation {
  if (!s.hasEvidence)
    return {
      tone: "gather",
      title: "Gather evidence: assign a short practice set",
      reason: "There are no graded answers on this skill yet, so there is nothing to judge — this is missing evidence, not weak performance. A few questions will show where the student stands.",
    };
  if (LEVEL_RANK[s.level] < LEVEL_RANK.proficient) {
    const active = s.misconceptions.find((m) => m.status === "teacher_confirmed" || m.status === "hypothesis");
    if (active)
      return {
        tone: "support",
        title: `Address “${active.title}” before more practice`,
        reason: `${active.remediation} ${active.status === "teacher_confirmed" ? "Confirmed by a teacher" : "Suggested by the pattern of wrong answers (not confirmed)"}; seen ${active.occurrences} time${active.occurrences === 1 ? "" : "s"}.`,
      };
    if (s.mostlyCorrect)
      return {
        tone: "gather",
        title: "Mostly correct so far — gather more independent evidence",
        reason: `This is too little evidence to call, not weak performance.${s.unmet.length ? ` Still needed for ${LEVEL_LABEL[s.nextLevel ?? "proficient"]}: ${s.unmet.join("; ")}.` : ""}`,
      };
    const weakPrereq = s.prerequisites.find((p) => p.weak);
    if (weakPrereq)
      return {
        tone: "support",
        title: `Check the prerequisite “${weakPrereq.name}” first`,
        reason: `Evidence on ${weakPrereq.name} is also below Proficient (${LEVEL_LABEL[weakPrereq.level]}), so the difficulty may start there.`,
      };
    if (s.counts.assistedAttempts > s.counts.independentAttempts)
      return {
        tone: "support",
        title: "Assign independent practice",
        reason: `${s.counts.assistedAttempts} of ${s.counts.attempts} answers used hints, solutions, the tutor or retries, which count for much less. Independent answers are needed to show what the student can do alone.`,
      };
    if (s.weakestPattern)
      return {
        tone: "support",
        title: `Target “${s.weakestPattern}” problems`,
        reason: `This type of problem has the weakest unassisted record.${s.unmet.length ? ` Still needed for ${LEVEL_LABEL[s.nextLevel ?? "proficient"]}: ${s.unmet.join("; ")}.` : ""}`,
      };
    const untested = s.prerequisites.filter((p) => p.level === "not_started").map((p) => p.name);
    return {
      tone: "support",
      title: "Assign targeted practice",
      reason: `${s.unmet.length ? `Still needed for ${LEVEL_LABEL[s.nextLevel ?? "proficient"]}: ${s.unmet.join("; ")}.` : "More independent correct answers are needed."}${untested.length ? ` Prerequisite not yet assessed: ${untested.join(", ")}.` : ""}`,
    };
  }
  if (s.needsReview)
    return {
      tone: "review",
      title: "Assign a short review",
      reason: `Flagged because ${s.reviewReason ?? "fresh evidence is due"}. Review asks for new evidence; it never lowers the level by itself.`,
    };
  void tree;
  return {
    tone: "on_track",
    title: "On track — no action needed",
    reason: s.level === "mastered" ? "Mastered with diverse, independent evidence across sittings." : `Proficient.${s.unmet.length ? ` For Mastered: ${s.unmet.join("; ")}.` : ""}`,
  };
}

// ───────────────────────────── skill evidence ────────────────────────────────

export async function buildSkillEvidence(user: StaffUser, studentId: string, skillId: string, tree: CourseTree, states: StateMap): Promise<SkillEvidence> {
  const detail = await getSkillDetail(user as Actor, studentId, skillId, { includeAnswers: true });
  const bodies = await questionBodies(detail.evidence);
  const ex = detail.explanation;
  const hasEvidence = detail.evidence.length > 0 || detail.level !== "not_started";
  const node = tree.skills.get(skillId);

  const responses = detail.evidence.map((e) => ({
    id: e.id,
    attemptId: e.attemptId,
    prompt: e.prompt,
    patternLabel: e.patternLabel,
    modeLabel: MODE_LABEL[e.mode] ?? e.mode,
    summative: SUMMATIVE.has(e.mode),
    correct: e.correct,
    score: e.score,
    independent: e.independent,
    assistance: assistanceOf(e),
    studentAnswer: formatAnswer(bodies.get(`${e.questionId}:${e.correctAnswer ?? ""}`), e.response),
    correctAnswer: e.correctAnswer ?? null,
    misconceptionTitle: e.misconceptionTitle,
    occurredAt: e.occurredAt.toISOString(),
  }));

  const byAttempt = new Map<string, EvidenceAssessmentResult>();
  for (const r of responses) {
    if (!r.summative) continue;
    const cur = byAttempt.get(r.attemptId) ?? { attemptId: r.attemptId, modeLabel: r.modeLabel, at: r.occurredAt, correct: 0, total: 0 };
    cur.total += 1;
    if (r.correct) cur.correct += 1;
    if (r.occurredAt > cur.at) cur.at = r.occurredAt;
    byAttempt.set(r.attemptId, cur);
  }

  const history: SkillEvidence["history"] = [];
  for (const h of detail.history) if (history.length === 0 || history[history.length - 1].level !== h.level) history.push({ at: h.at.toISOString(), level: h.level });

  const base: Omit<SkillEvidence, "recommendation"> = {
    skillId,
    name: detail.skill.name,
    description: detail.skill.description,
    level: detail.level,
    needsReview: detail.state?.needsReview ?? false,
    reviewReason: ex?.reviewReason ? (REVIEW_REASON[ex.reviewReason] ?? ex.reviewReason) : null,
    hasEvidence,
    mostlyCorrect: hasEvidence && LEVEL_RANK[detail.level] < LEVEL_RANK.proficient && (detail.state?.estimate ?? 0) >= WEAK_ESTIMATE,
    summary: ex?.summary ?? null,
    nextLevel: ex?.nextLevel ?? (detail.level === "not_started" ? "developing" : null),
    unmet: ex?.unmet ?? [],
    counts: {
      attempts: ex?.attempts ?? detail.evidence.length,
      correct: detail.evidence.filter((e) => e.correct).length,
      independentAttempts: ex?.independentAttempts ?? detail.evidence.filter((e) => e.independent).length,
      independentCorrect: ex?.independentCorrect ?? detail.evidence.filter((e) => e.independent && e.correct).length,
      assistedAttempts: ex?.assistedAttempts ?? detail.evidence.filter((e) => !e.independent).length,
      uniqueQuestions: ex?.uniqueQuestions ?? new Set(detail.evidence.map((e) => e.questionId)).size,
      uniqueQuestionsCorrect: ex?.uniqueQuestionsCorrect ?? 0,
      distinctPatternsCorrect: ex?.distinctPatternsCorrect ?? 0,
      summativeIndependentCorrect: ex?.summativeIndependentCorrect ?? 0,
      distinctSittings: ex?.distinctSittings ?? 0,
    },
    patterns: (ex?.patterns ?? []).map((p) => ({ label: detail.skill.patternLabels[p.pattern] ?? p.pattern, attempts: p.attempts, independentAttempts: p.independentAttempts, independentCorrect: p.independentCorrect })),
    weakestPattern: ex?.weakestPattern ? (detail.skill.patternLabels[ex.weakestPattern] ?? ex.weakestPattern) : null,
    responses,
    assessments: [...byAttempt.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6),
    misconceptions: detail.misconceptions
      .map((m) => ({ id: m.id, title: m.title, description: m.description, remediation: m.remediation, status: m.status, detectionMethod: m.detectionMethod, occurrences: m.occurrences, correctSinceLast: m.correctSinceLast, lastObservedAt: m.lastObservedAt.toISOString() }))
      .sort((a, b) => b.lastObservedAt.localeCompare(a.lastObservedAt)),
    history,
    prerequisites: (node?.prerequisites ?? []).map((id) => {
      const st = states.get(id);
      const level = st?.level ?? "not_started";
      return { id, name: tree.skills.get(id)?.name ?? id, level, weak: Boolean(st) && LEVEL_RANK[level] < LEVEL_RANK.proficient && (st?.estimate ?? 0) < WEAK_ESTIMATE };
    }),
    lastDemonstratedAt: ex?.lastDemonstratedAt ?? null,
  };
  return { ...base, recommendation: recommendForSkill(base, tree) };
}

// ───────────────────────────── cell evidence ─────────────────────────────────

function columnExplanation(level: MasteryLevel, kind: "objective" | "skill", skills: SkillEvidence[]): string {
  const total = skills.length;
  const tested = skills.filter((s) => s.hasEvidence);
  if (tested.length === 0)
    return kind === "skill"
      ? "No graded answers on this skill yet. This is missing evidence, not weak performance."
      : `No graded answers yet on any of the ${total} skill${total === 1 ? "" : "s"} in this objective. This is missing evidence, not weak performance.`;
  if (kind === "skill") return skills[0].summary ?? `${LEVEL_LABEL[level]}.`;
  if (tested.length < total) {
    const untested = skills.filter((s) => !s.hasEvidence).map((s) => s.name);
    return `${LEVEL_LABEL[level]}: evidence on ${tested.length} of ${total} skills. An objective can't read Proficient until every skill has evidence, so partial coverage is capped at Approaching mastery. Not yet tested: ${untested.join(", ")}.`;
  }
  const weakest = [...skills].sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level])[0];
  return `${LEVEL_LABEL[level]}: every skill has evidence, and an objective takes its weakest skill's level — ${weakest.name} is ${LEVEL_LABEL[weakest.level]}.`;
}

function cellRecommendation(skills: SkillEvidence[]): Recommendation {
  const below = skills.filter((s) => s.hasEvidence && LEVEL_RANK[s.level] < LEVEL_RANK.proficient).sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
  const weak = [...below.filter((s) => !s.mostlyCorrect), ...below.filter((s) => s.mostlyCorrect)];
  if (weak.length) {
    const r = weak[0].recommendation;
    return skills.length > 1 ? { ...r, reason: `${weak[0].name}: ${r.reason}` } : r;
  }
  const untested = skills.filter((s) => !s.hasEvidence);
  if (untested.length === skills.length) return skills.length === 1 ? skills[0].recommendation : { tone: "gather", title: "Gather evidence: assign a short practice set", reason: "No graded answers on this objective yet, so there is nothing to judge — this is missing evidence, not weak performance." };
  if (untested.length) return { tone: "gather", title: "Assign practice on the untested skills", reason: `Tested skills look secure. Not yet tested: ${untested.map((s) => s.name).join(", ")}.` };
  const review = skills.find((s) => s.needsReview);
  if (review) return skills.length > 1 ? { ...review.recommendation, reason: `${review.name}: ${review.recommendation.reason}` } : review.recommendation;
  return skills.length === 1 ? skills[0].recommendation : { tone: "on_track", title: "On track — no action needed", reason: "Every skill in this objective is Proficient or better." };
}

/**
 * Evidence for one heatmap cell. Authorises: staff of the class, student on
 * its active roster, column part of the class's course.
 */
export async function buildCellEvidence(user: StaffUser, classId: string, studentId: string, columnId: string): Promise<CellEvidence> {
  const db = await getDb();
  const cls = await assertClassStaff(db, user, classId);
  const tree = await getCourseTree(cls.courseId);
  if (!tree) throw new DomainError("not_found", "Course not found.");
  const roster = await getRoster(user, classId);
  const student = roster.find((s) => s.id === studentId);
  if (!student) throw new DomainError("not_found", "That student isn't in this class.");

  const objective = tree.objectives.get(columnId);
  const skillNode = objective ? null : tree.skills.get(columnId);
  if (!objective && !skillNode) throw new DomainError("not_found", "Objective or skill not found in this class's course.");
  const skillIds = objective ? objective.skillIds : [columnId];

  const stateRows = await studentStates(user, studentId, cls.courseId);
  const states: StateMap = new Map(stateRows.map((s) => [s.skillId, { skillId: s.skillId, level: s.level, estimate: s.estimate, needsReview: s.needsReview }]));
  const skills: SkillEvidence[] = [];
  for (const id of skillIds) skills.push(await buildSkillEvidence(user, studentId, id, tree, states));

  const r = rollup(skillIds, states);
  const kind = objective ? "objective" : "skill";
  return {
    classId,
    student: { id: student.id, name: student.name },
    column: objective
      ? { id: objective.id, kind, label: objective.code, description: objective.description }
      : { id: columnId, kind, label: skillNode!.name, description: skillNode!.description },
    level: r.level,
    needsReview: r.needsReview > 0,
    skillsWithEvidence: r.skillsWithEvidence,
    totalSkills: r.totalSkills,
    explanation: columnExplanation(r.level, kind, skills),
    skills,
    recommendation: cellRecommendation(skills),
    practiceSkillIds: skills.filter((s) => LEVEL_RANK[s.level] < LEVEL_RANK.proficient || s.needsReview).map((s) => s.skillId),
  };
}
