/**
 * Content schemas — the single definition of what a lesson block and a
 * question look like. Authored content (content/), the database (jsonb
 * columns), the grader and the renderers all share these types.
 *
 * Adding a new block or question type = add a schema here, register a
 * renderer (components/lesson, components/questions) and, for questions, a
 * grader (modules/assessments/grading.ts).
 */
import { z } from "zod";

// ───────────────────────────── Question bodies ──────────────────────────────

const choiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  /** Misconception this distractor is diagnostic of (catalog id). */
  misconception: z.string().optional(),
  /** Short explanation shown after answering. */
  rationale: z.string().optional(),
});

export const multipleChoiceBody = z.object({
  type: z.literal("multiple_choice"),
  choices: z.array(choiceSchema).min(2),
  correctChoiceId: z.string(),
});

export const multiSelectBody = z.object({
  type: z.literal("multi_select"),
  choices: z.array(choiceSchema).min(2),
  correctChoiceIds: z.array(z.string()).min(1),
});

export const numericBody = z.object({
  type: z.literal("numeric"),
  answer: z.number(),
  /** Absolute and/or relative tolerance; a response passes if it meets either. */
  tolerance: z.object({ abs: z.number().nonnegative().optional(), rel: z.number().nonnegative().optional() }),
  /** Display-only unit label (e.g. "m/s"). */
  unit: z.string().optional(),
  commonErrors: z
    .array(z.object({ value: z.number(), misconception: z.string(), note: z.string().optional() }))
    .optional(),
});

export const expressionBody = z.object({
  type: z.literal("expression"),
  /** Correct answer in calculator syntax, e.g. "6*x*(x^2+1)^2". */
  answer: z.string(),
  variables: z.array(z.string()).min(1),
  /** Sampling interval for equivalence checking (inclusive). */
  domain: z.tuple([z.number(), z.number()]).optional(),
  commonErrors: z
    .array(z.object({ expr: z.string(), misconception: z.string(), note: z.string().optional() }))
    .optional(),
  /** Shown under the input, e.g. "Use ^ for powers and * for multiplication." */
  inputHint: z.string().optional(),
});

export const orderingBody = z.object({
  type: z.literal("ordering"),
  items: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  correctOrder: z.array(z.string()).min(2),
});

export const matchingBody = z.object({
  type: z.literal("matching"),
  left: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  right: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  /** leftId → rightId */
  pairs: z.record(z.string(), z.string()),
});

export const shortResponseBody = z.object({
  type: z.literal("short_response"),
  rubric: z.array(z.object({ id: z.string(), description: z.string(), points: z.number().positive() })).min(1),
  sampleResponse: z.string(),
});

export const questionBodySchema = z.discriminatedUnion("type", [
  multipleChoiceBody,
  multiSelectBody,
  numericBody,
  expressionBody,
  orderingBody,
  matchingBody,
  shortResponseBody,
]);
export type QuestionBody = z.infer<typeof questionBodySchema>;
export type QuestionType = QuestionBody["type"];

/** A simulation embedded as a stimulus the student must use to answer. */
export const stimulusSchema = z.object({
  simulation: z.object({ id: z.string(), params: z.record(z.string(), z.union([z.number(), z.string()])).optional() }),
});
export type Stimulus = z.infer<typeof stimulusSchema>;

export const authoredQuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  /** Skills this item gives evidence for. The first is the primary skill. */
  skillIds: z.array(z.string()).min(1),
  /** 1 (introductory) … 5 (hardest AP-level). */
  difficulty: z.number().int().min(1).max(5),
  /**
   * Problem pattern / template key. Evidence diversity is measured over
   * distinct patterns, so two items that differ only in numbers share one.
   */
  pattern: z.string().min(1),
  estSeconds: z.number().int().positive().default(90),
  prompt: z.string().min(1),
  body: questionBodySchema,
  hints: z.array(z.string()).default([]),
  solution: z.string().min(1),
  stimulus: stimulusSchema.optional(),
});
export type AuthoredQuestion = z.infer<typeof authoredQuestionSchema>;
export type AuthoredQuestionInput = z.input<typeof authoredQuestionSchema>;

/** Question types the platform recognises, with honest support status. */
export const QUESTION_TYPE_SUPPORT: Record<
  string,
  { label: string; grading: "automatic" | "teacher_rubric" | "planned"; note?: string }
> = {
  multiple_choice: { label: "Multiple choice", grading: "automatic" },
  multi_select: { label: "Select all that apply", grading: "automatic" },
  numeric: { label: "Numeric response", grading: "automatic", note: "Absolute / relative tolerance" },
  expression: {
    label: "Mathematical expression",
    grading: "automatic",
    note: "Equivalence by deterministic numeric sampling",
  },
  ordering: { label: "Ordering / sorting", grading: "automatic" },
  matching: { label: "Matching", grading: "automatic" },
  short_response: { label: "Short written response", grading: "teacher_rubric" },
  graph_construction: { label: "Graph construction", grading: "planned" },
  document_analysis: { label: "Document-based question", grading: "planned" },
  essay: { label: "Essay / long-form writing", grading: "planned" },
  code: { label: "Code writing and debugging", grading: "planned" },
  audio: { label: "Listening and speaking", grading: "planned" },
  portfolio: { label: "Portfolio / performance task", grading: "planned" },
};

// ─────────────────────────────── Lesson blocks ──────────────────────────────

export const lessonBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), md: z.string() }),
  z.object({
    type: z.literal("callout"),
    tone: z.enum(["info", "tip", "warning", "key"]),
    title: z.string().optional(),
    md: z.string(),
  }),
  z.object({ type: z.literal("definition"), term: z.string(), md: z.string() }),
  z.object({ type: z.literal("formula"), latex: z.string(), caption: z.string().optional() }),
  z.object({
    type: z.literal("worked_example"),
    title: z.string(),
    problem: z.string(),
    steps: z.array(z.object({ title: z.string().optional(), md: z.string() })).min(1),
    answer: z.string().optional(),
  }),
  /** A banked question embedded as a low-stakes check for understanding. */
  z.object({ type: z.literal("check"), questionId: z.string(), lead: z.string().optional() }),
  z.object({
    type: z.literal("simulation"),
    simId: z.string(),
    params: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
    title: z.string().optional(),
    /** Things to try — exploration prompts, not graded. */
    explore: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("note_prompt"),
    prompt: z.string(),
    suggestedTitle: z.string(),
    starter: z.string().optional(),
  }),
  z.object({ type: z.literal("tutor_prompt"), prompts: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("summary"), points: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("image"), src: z.string(), alt: z.string(), caption: z.string().optional() }),
]);
export type LessonBlock = z.infer<typeof lessonBlockSchema>;
export type LessonBlockType = LessonBlock["type"];

export const lessonBlocksSchema = z.array(lessonBlockSchema);

// ─────────────────────────── Authored course content ────────────────────────

export const authoredSkillSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  name: z.string(),
  description: z.string(),
  difficulty: z.number().int().min(1).max(5).default(3),
  keywords: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  /** Human labels for the question patterns used by this skill's items. */
  patternLabels: z.record(z.string(), z.string()).default({}),
});
export type AuthoredSkill = z.infer<typeof authoredSkillSchema>;

export const authoredMisconceptionSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  skillId: z.string(),
  title: z.string(),
  description: z.string(),
  remediation: z.string(),
});

export const authoredLessonSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  title: z.string(),
  summary: z.string(),
  estMinutes: z.number().int().positive(),
  skillIds: z.array(z.string()).default([]),
  blocks: lessonBlocksSchema,
});

export const authoredObjectiveSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  /** AceAP's own short code, e.g. "CALC-3.A". Not a College Board code. */
  code: z.string(),
  description: z.string(),
  skillIds: z.array(z.string()).min(1),
});

export const authoredTopicSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  title: z.string(),
  description: z.string(),
  objectives: z.array(authoredObjectiveSchema).default([]),
  lessons: z.array(authoredLessonSchema).default([]),
});

export const authoredUnitSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  number: z.number().int().positive(),
  title: z.string(),
  description: z.string().default(""),
  topics: z.array(authoredTopicSchema).default([]),
});

export const assessmentConfigSchema = z.object({
  /** Seconds; omitted = untimed. */
  timeLimitSeconds: z.number().int().positive().optional(),
  /** When answers/solutions are revealed. */
  feedback: z.enum(["immediate", "after_submit"]).default("after_submit"),
  /** Whether hints and the AI tutor are available while the attempt is open. */
  assistance: z.enum(["allowed", "disabled"]).default("disabled"),
  /**
   * Exercises only: questions served per attempt, drawn from the assessment's
   * question pool (unseen and previously missed questions first, varied
   * patterns). Omitted = every listed question, in order.
   */
  questionsPerAttempt: z.number().int().positive().optional(),
});
export type AssessmentConfig = z.infer<typeof assessmentConfigSchema>;

export const ASSESSMENT_KINDS = [
  /** Topic practice set placed on the roadmap after its lessons: a fresh draw from a pool each attempt, immediate feedback, hints allowed; recorded as guided practice. */
  "exercise",
  "lesson_quiz",
  "skill_quiz",
  "unit_test",
  "course_review",
  "exam_practice",
  "custom",
] as const;
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];

export const authoredAssessmentSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  kind: z.enum(ASSESSMENT_KINDS),
  title: z.string(),
  description: z.string().default(""),
  unitId: z.string().optional(),
  topicId: z.string().optional(),
  questionIds: z.array(z.string()).min(1),
  config: assessmentConfigSchema.default({ feedback: "after_submit", assistance: "disabled" }),
});

export const authoredSimulationSchema = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string(),
  variables: z.array(z.object({ name: z.string(), description: z.string() })),
  outputs: z.array(z.string()),
  skillIds: z.array(z.string()),
  accessibilityAlternative: z.string(),
  /** Simulations never write mastery; only engagement events are recorded. */
  telemetry: z.literal("engagement_only").default("engagement_only"),
});

export const provenanceSchema = z.object({
  author: z.string(),
  origin: z.enum(["original", "ai_assisted_original", "licensed", "teacher_contributed"]),
  reviewedBy: z.string().optional(),
  notes: z.string().optional(),
});
export type Provenance = z.infer<typeof provenanceSchema>;

export const courseContentSchema = z.object({
  courseId: z.string(),
  version: z.object({
    id: z.string(),
    label: z.string(),
    alignmentSourceUrl: z.string().url(),
    alignmentNotes: z.string(),
  }),
  provenance: provenanceSchema,
  units: z.array(authoredUnitSchema),
  skills: z.array(authoredSkillSchema),
  misconceptions: z.array(authoredMisconceptionSchema).default([]),
  questions: z.array(authoredQuestionSchema),
  assessments: z.array(authoredAssessmentSchema).default([]),
  simulations: z.array(authoredSimulationSchema).default([]),
});
export type CourseContent = z.infer<typeof courseContentSchema>;
export type CourseContentInput = z.input<typeof courseContentSchema>;

/** Identity helper giving authors type-checking and editor completion. */
export function defineCourse(content: CourseContentInput): CourseContentInput {
  return content;
}
