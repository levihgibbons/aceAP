/**
 * AceAP database schema (PostgreSQL, Drizzle ORM).
 *
 * Conventions
 *  - Shared curriculum/content tables use stable, human-readable text ids
 *    (e.g. "calculus-ab.chain.trig") so content sync is idempotent.
 *  - Private per-user records use uuid ids.
 *  - Evidence-type tables denormalise `course_id` so row-level-security
 *    policies can scope a teacher to the course they actually teach.
 *  - Observations (responses, evidence, events) are append-only; derived state
 *    (mastery_states, activity_aggregates) is rebuildable from them.
 *
 * Row-level security is defined in drizzle/0001_row_level_security.sql.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AssessmentConfig, LessonBlock, Provenance, QuestionBody, Stimulus } from "@/modules/content/schema";
import type { MasteryLevel, MasteryPolicyConfig, SkillExplanation } from "@/modules/mastery/types";
import type { GradingPolicyConfig } from "@/modules/gradebook/policy";

const id = () => uuid("id").primaryKey().defaultRandom();
const tz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => tz("created_at").notNull().defaultNow();

// ════════════════════════════ Identity & organisations ══════════════════════

export type UserRole = "student" | "teacher" | "school_admin" | "platform_admin";

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<UserRole>().notNull().default("student"),
    /** Seeded fictional accounts are labelled in the UI. */
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    deletedAt: tz("deleted_at"),
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    /** SHA-256 of the opaque cookie token; the token itself is never stored. */
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: tz("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sessions_token_hash_unique").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("organizations_slug_unique").on(t.slug)],
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<"teacher" | "school_admin" | "student">().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.userId] }), index("org_memberships_user_idx").on(t.userId)],
);

// ════════════════════════════════ Curriculum ════════════════════════════════

export type CourseContentStatus =
  | "catalog_only"
  | "outline_available"
  | "lessons_in_development"
  | "pilot_available"
  | "complete";

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  /** Whether College Board currently offers the course. */
  availability: text("availability").$type<"active" | "upcoming">().notNull().default("active"),
  availabilityNote: text("availability_note"),
  /** How much AceAP content exists — never implied to be more than it is. */
  contentStatus: text("content_status").$type<CourseContentStatus>().notNull().default("catalog_only"),
  sourceUrl: text("source_url").notNull(),
  catalogVerifiedOn: date("catalog_verified_on"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const courseVersions = pgTable(
  "course_versions",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    alignmentSourceUrl: text("alignment_source_url").notNull(),
    alignmentNotes: text("alignment_notes").notNull().default(""),
    verificationStatus: text("verification_status")
      .$type<"outline_from_official_index" | "aligned_by_author" | "unverified">()
      .notNull()
      .default("unverified"),
    isCurrent: boolean("is_current").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("course_versions_course_idx").on(t.courseId)],
);

export const units = pgTable(
  "units",
  {
    id: text("id").primaryKey(),
    courseVersionId: text("course_version_id")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** "outline" units list a title only; "available" units have lessons. */
    status: text("status").$type<"outline" | "available">().notNull().default("outline"),
  },
  (t) => [uniqueIndex("units_version_slug_unique").on(t.courseVersionId, t.slug), index("units_course_idx").on(t.courseId)],
);

export const topics = pgTable(
  "topics",
  {
    id: text("id").primaryKey(),
    unitId: text("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
  },
  (t) => [index("topics_unit_idx").on(t.unitId)],
);

export const learningObjectives = pgTable(
  "learning_objectives",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    courseVersionId: text("course_version_id").notNull(),
    code: text("code").notNull(),
    description: text("description").notNull(),
    ordinal: integer("ordinal").notNull().default(0),
  },
  (t) => [index("objectives_topic_idx").on(t.topicId), index("objectives_course_idx").on(t.courseId)],
);

/** Maps objectives across curriculum versions; evidence is never auto-moved. */
export const objectiveMappings = pgTable(
  "objective_mappings",
  {
    fromObjectiveId: text("from_objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    toObjectiveId: text("to_objective_id").references(() => learningObjectives.id, { onDelete: "cascade" }),
    mappingType: text("mapping_type").$type<"equivalent" | "partial" | "retired_unmapped">().notNull(),
    notes: text("notes").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.fromObjectiveId, t.mappingType] })],
);

export const skills = pgTable(
  "skills",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    difficulty: integer("difficulty").notNull().default(3),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    patternLabels: jsonb("pattern_labels").$type<Record<string, string>>().notNull().default({}),
    ordinal: integer("ordinal").notNull().default(0),
  },
  (t) => [index("skills_course_idx").on(t.courseId)],
);

export const objectiveSkills = pgTable(
  "objective_skills",
  {
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.objectiveId, t.skillId] }), index("objective_skills_skill_idx").on(t.skillId)],
);

export const skillPrerequisites = pgTable(
  "skill_prerequisites",
  {
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    prerequisiteSkillId: text("prerequisite_skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.skillId, t.prerequisiteSkillId] })],
);

export type SkillRelationType = "RELATED_TO" | "APPLIED_IN" | "EXPLAINS";

/** Shared (not per-student) concept relationships, including cross-course. */
export const skillRelationships = pgTable(
  "skill_relationships",
  {
    fromSkillId: text("from_skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    toSkillId: text("to_skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    type: text("type").$type<SkillRelationType>().notNull(),
    rationale: text("rationale").notNull(),
  },
  (t) => [primaryKey({ columns: [t.fromSkillId, t.toSkillId, t.type] })],
);

export const misconceptions = pgTable(
  "misconceptions",
  {
    id: text("id").primaryKey(),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    remediation: text("remediation").notNull(),
  },
  (t) => [index("misconceptions_skill_idx").on(t.skillId)],
);

// ═════════════════════════════ Learning content ═════════════════════════════

export type ContentStatus = "draft" | "in_review" | "validated" | "published" | "retired";

export const lessons = pgTable(
  "lessons",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    unitId: text("unit_id").notNull(),
    courseId: text("course_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    estMinutes: integer("est_minutes").notNull(),
    /** Version students currently see; null until something is published. */
    publishedVersion: integer("published_version"),
  },
  (t) => [index("lessons_topic_idx").on(t.topicId), index("lessons_course_idx").on(t.courseId)],
);

export const lessonVersions = pgTable(
  "lesson_versions",
  {
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    blocks: jsonb("blocks").$type<LessonBlock[]>().notNull(),
    contentHash: text("content_hash").notNull(),
    status: text("status").$type<ContentStatus>().notNull().default("draft"),
    provenance: jsonb("provenance").$type<Provenance>().notNull(),
    createdAt: createdAt(),
    publishedAt: tz("published_at"),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.version] })],
);

export const lessonSkills = pgTable(
  "lesson_skills",
  {
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.skillId] }), index("lesson_skills_skill_idx").on(t.skillId)],
);

export const simulations = pgTable("simulations", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  purpose: text("purpose").notNull(),
  variables: jsonb("variables").$type<{ name: string; description: string }[]>().notNull(),
  outputs: jsonb("outputs").$type<string[]>().notNull(),
  skillIds: jsonb("skill_ids").$type<string[]>().notNull(),
  accessibilityAlternative: text("accessibility_alternative").notNull(),
  telemetry: text("telemetry").notNull().default("engagement_only"),
});

/** Licensing registry for anything not written by AceAP. */
export const contentSources = pgTable("content_sources", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  provider: text("provider").notNull(),
  url: text("url").notNull(),
  license: text("license").notNull(),
  attribution: text("attribution").notNull().default(""),
  commercialUse: text("commercial_use").$type<"allowed" | "not_allowed" | "requires_agreement" | "unverified">().notNull(),
  modification: text("modification").$type<"allowed" | "not_allowed" | "unverified">().notNull(),
  usage: text("usage").$type<"alignment_reference" | "linked" | "embedded" | "adapted" | "not_used">().notNull(),
  approvalStatus: text("approval_status").$type<"approved" | "pending_review" | "rejected">().notNull(),
  notes: text("notes").notNull().default(""),
  reviewedOn: date("reviewed_on"),
});

export const contentReviews = pgTable(
  "content_reviews",
  {
    id: id(),
    entityType: text("entity_type").$type<"lesson" | "question">().notNull(),
    entityId: text("entity_id").notNull(),
    version: integer("version").notNull(),
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    reviewerLabel: text("reviewer_label").notNull(),
    decision: text("decision").$type<"approved" | "changes_requested" | "automated_checks_passed">().notNull(),
    checks: jsonb("checks").$type<{ name: string; passed: boolean; detail?: string }[]>().notNull().default([]),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("content_reviews_entity_idx").on(t.entityType, t.entityId)],
);

// ════════════════════════════════ Assessments ═══════════════════════════════

export const questions = pgTable(
  "questions",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    /** Version served to students; null until published. */
    publishedVersion: integer("published_version"),
    primarySkillId: text("primary_skill_id")
      .notNull()
      .references(() => skills.id),
  },
  (t) => [index("questions_course_idx").on(t.courseId), index("questions_primary_skill_idx").on(t.primarySkillId)],
);

export const questionVersions = pgTable(
  "question_versions",
  {
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    prompt: text("prompt").notNull(),
    body: jsonb("body").$type<QuestionBody>().notNull(),
    hints: jsonb("hints").$type<string[]>().notNull().default([]),
    solution: text("solution").notNull(),
    stimulus: jsonb("stimulus").$type<Stimulus | null>(),
    difficulty: integer("difficulty").notNull(),
    pattern: text("pattern").notNull(),
    estSeconds: integer("est_seconds").notNull().default(90),
    contentHash: text("content_hash").notNull(),
    status: text("status").$type<ContentStatus>().notNull().default("draft"),
    provenance: jsonb("provenance").$type<Provenance>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.version] })],
);

export const questionSkills = pgTable(
  "question_skills",
  {
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.skillId] }), index("question_skills_skill_idx").on(t.skillId)],
);

export const assessments = pgTable(
  "assessments",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    unitId: text("unit_id"),
    topicId: text("topic_id"),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    config: jsonb("config").$type<AssessmentConfig>().notNull(),
    /** Null for curriculum assessments; set for teacher-built question sets. */
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("assessments_course_idx").on(t.courseId)],
);

export const assessmentItems = pgTable(
  "assessment_items",
  {
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
  },
  (t) => [primaryKey({ columns: [t.assessmentId, t.questionId] })],
);

/** How an attempt was taken. Formative and summative modes stay distinguishable. */
export type AttemptMode =
  | "lesson_check"
  | "guided_practice"
  | "skill_quiz"
  | "lesson_quiz"
  | "unit_test"
  | "course_review"
  | "exam_practice"
  | "custom";

export const attempts = pgTable(
  "attempts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    mode: text("mode").$type<AttemptMode>().notNull(),
    assessmentId: text("assessment_id").references(() => assessments.id, { onDelete: "set null" }),
    assignmentId: uuid("assignment_id"),
    /** Practice target (skill) or lesson for lesson checks. */
    skillId: text("skill_id"),
    lessonId: text("lesson_id"),
    /** Ordered question ids + pinned versions served in this attempt. */
    items: jsonb("items").$type<{ questionId: string; version: number }[]>().notNull().default([]),
    /**
     * Deferred-feedback modes only: answers saved but not yet graded. They are
     * graded and turned into responses + evidence when the attempt is submitted.
     */
    draftAnswers: jsonb("draft_answers").$type<Record<string, unknown>>().notNull().default({}),
    /** Skills whose spaced review was due when this attempt was built. */
    reviewSkillIds: jsonb("review_skill_ids").$type<string[]>().notNull().default([]),
    /** allowed = hints + tutor · hints_only = authored hints, no AI tutor · disabled = neither. */
    assistance: text("assistance").$type<"allowed" | "hints_only" | "disabled">().notNull().default("allowed"),
    feedback: text("feedback").$type<"immediate" | "after_submit">().notNull().default("immediate"),
    timeLimitSeconds: integer("time_limit_seconds"),
    status: text("status").$type<"in_progress" | "submitted" | "abandoned">().notNull().default("in_progress"),
    startedAt: tz("started_at").notNull().defaultNow(),
    submittedAt: tz("submitted_at"),
    score: doublePrecision("score"),
    maxScore: doublePrecision("max_score"),
  },
  (t) => [
    index("attempts_user_idx").on(t.userId, t.startedAt),
    index("attempts_assignment_idx").on(t.assignmentId),
    index("attempts_user_course_idx").on(t.userId, t.courseId),
  ],
);

export const questionResponses = pgTable(
  "question_responses",
  {
    id: id(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id),
    questionVersion: integer("question_version").notNull(),
    response: jsonb("response").$type<unknown>().notNull(),
    /** 0..1; null while a rubric-scored response awaits a teacher. */
    score: doublePrecision("score"),
    isCorrect: boolean("is_correct"),
    /** 1 for the first try at this item in this attempt, 2 for a retry, … */
    tryNumber: integer("try_number").notNull().default(1),
    hintsUsed: integer("hints_used").notNull().default(0),
    solutionViewed: boolean("solution_viewed").notNull().default(false),
    tutorUsed: boolean("tutor_used").notNull().default(false),
    misconceptionId: text("misconception_id"),
    timeSpentMs: integer("time_spent_ms"),
    /** "auto:<grader version>" or "teacher:<user id>". */
    gradedBy: text("graded_by"),
    gradingVersion: text("grading_version"),
    rubricScores: jsonb("rubric_scores").$type<Record<string, number> | null>(),
    /** Client-generated; makes double submits a no-op. */
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: createdAt(),
    gradedAt: tz("graded_at"),
  },
  (t) => [
    uniqueIndex("responses_idempotency_unique").on(t.userId, t.idempotencyKey),
    index("responses_attempt_idx").on(t.attemptId),
    index("responses_user_question_idx").on(t.userId, t.questionId),
  ],
);

/** Hints revealed per (attempt, question) — recorded before the answer. */
export const hintReveals = pgTable(
  "hint_reveals",
  {
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    userId: uuid("user_id").notNull(),
    hintsRevealed: integer("hints_revealed").notNull().default(0),
    solutionViewed: boolean("solution_viewed").notNull().default(false),
    tutorUsed: boolean("tutor_used").notNull().default(false),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })],
);

// ═════════════════════════════════ Mastery ══════════════════════════════════

export const masteryPolicies = pgTable(
  "mastery_policies",
  {
    id: id(),
    /** Null organisation = platform default policy. */
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    version: integer("version").notNull(),
    config: jsonb("config").$type<MasteryPolicyConfig>().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("mastery_policies_org_idx").on(t.organizationId, t.isActive)],
);

/** One immutable row per (graded response, skill). Raw facts only — weights
 *  are computed by the engine so a policy change can be replayed. */
export const masteryEvidence = pgTable(
  "mastery_evidence",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id),
    objectiveId: text("objective_id"),
    questionId: text("question_id").notNull(),
    questionVersion: integer("question_version").notNull(),
    pattern: text("pattern").notNull(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => questionResponses.id, { onDelete: "cascade" }),
    attemptId: uuid("attempt_id").notNull(),
    score: doublePrecision("score").notNull(),
    difficulty: integer("difficulty").notNull(),
    mode: text("mode").$type<AttemptMode>().notNull(),
    tryNumber: integer("try_number").notNull(),
    hintsUsed: integer("hints_used").notNull(),
    solutionViewed: boolean("solution_viewed").notNull(),
    tutorUsed: boolean("tutor_used").notNull(),
    /** Present when the item was taken as a scheduled retention review. */
    isRetentionReview: boolean("is_retention_review").notNull().default(false),
    scoringVersion: text("scoring_version").notNull(),
    occurredAt: tz("occurred_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("evidence_response_skill_unique").on(t.responseId, t.skillId),
    index("evidence_user_skill_idx").on(t.userId, t.skillId, t.occurredAt),
    index("evidence_user_course_idx").on(t.userId, t.courseId),
  ],
);

/** Current projection per (student, skill). Rebuildable from mastery_evidence. */
export const masteryStates = pgTable(
  "mastery_states",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id),
    courseId: text("course_id").notNull(),
    alpha: doublePrecision("alpha").notNull(),
    beta: doublePrecision("beta").notNull(),
    estimate: doublePrecision("estimate").notNull(),
    level: text("level").$type<MasteryLevel>().notNull(),
    needsReview: boolean("needs_review").notNull().default(false),
    explanation: jsonb("explanation").$type<SkillExplanation>().notNull(),
    lastEvidenceAt: tz("last_evidence_at"),
    lastDemonstratedAt: tz("last_demonstrated_at"),
    calcVersion: text("calc_version").notNull(),
    policyId: uuid("policy_id").notNull(),
    policyVersion: integer("policy_version").notNull(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] }), index("mastery_states_course_idx").on(t.courseId, t.userId)],
);

/** Append-only history: one row every time a state is (re)calculated. */
export const masterySnapshots = pgTable(
  "mastery_snapshots",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: text("skill_id").notNull(),
    courseId: text("course_id").notNull(),
    estimate: doublePrecision("estimate").notNull(),
    level: text("level").$type<MasteryLevel>().notNull(),
    needsReview: boolean("needs_review").notNull().default(false),
    alpha: doublePrecision("alpha").notNull(),
    beta: doublePrecision("beta").notNull(),
    evidenceCount: integer("evidence_count").notNull(),
    calcVersion: text("calc_version").notNull(),
    policyId: uuid("policy_id").notNull(),
    policyVersion: integer("policy_version").notNull(),
    /** What caused the recalculation. */
    trigger: text("trigger").$type<"evidence" | "policy_change" | "rebuild" | "retention">().notNull(),
    triggerEvidenceId: uuid("trigger_evidence_id"),
    createdAt: createdAt(),
  },
  (t) => [index("snapshots_user_skill_idx").on(t.userId, t.skillId, t.createdAt)],
);

export type MisconceptionStatus = "hypothesis" | "teacher_confirmed" | "potentially_resolved" | "resolved";

export const detectedMisconceptions = pgTable(
  "detected_misconceptions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    skillId: text("skill_id").notNull(),
    misconceptionId: text("misconception_id")
      .notNull()
      .references(() => misconceptions.id),
    detectionMethod: text("detection_method").$type<"answer_pattern_rule" | "teacher">().notNull(),
    status: text("status").$type<MisconceptionStatus>().notNull().default("hypothesis"),
    occurrences: integer("occurrences").notNull().default(1),
    /** Independent correct answers on the skill since the last occurrence. */
    correctSinceLast: integer("correct_since_last").notNull().default(0),
    responseIds: jsonb("response_ids").$type<string[]>().notNull().default([]),
    history: jsonb("history").$type<{ at: string; status: MisconceptionStatus; note: string }[]>().notNull().default([]),
    firstObservedAt: tz("first_observed_at").notNull().defaultNow(),
    lastObservedAt: tz("last_observed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("detected_misconceptions_unique").on(t.userId, t.misconceptionId), index("detected_misc_skill_idx").on(t.userId, t.skillId)],
);

export const reviewSchedule = pgTable(
  "review_schedule",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: text("skill_id").notNull(),
    courseId: text("course_id").notNull(),
    /** Index into the policy's review intervals. */
    stage: integer("stage").notNull().default(0),
    dueAt: tz("due_at").notNull(),
    lastReviewedAt: tz("last_reviewed_at"),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] }), index("review_schedule_due_idx").on(t.userId, t.dueAt)],
);

// ════════════════════════════════ Engagement ════════════════════════════════

export type LearningEventType =
  | "LESSON_STARTED"
  | "LESSON_COMPLETED"
  | "QUESTION_SUBMITTED"
  | "HINT_REQUESTED"
  | "SOLUTION_VIEWED"
  | "ASSESSMENT_STARTED"
  | "ASSESSMENT_SUBMITTED"
  | "SIMULATION_INTERACTED"
  | "REVIEW_COMPLETED"
  | "NOTE_CREATED"
  | "MASTERY_RECALCULATED"
  | "TUTOR_MESSAGE";

export const learningEvents = pgTable(
  "learning_events",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id"),
    type: text("type").$type<LearningEventType>().notNull(),
    courseId: text("course_id"),
    skillId: text("skill_id"),
    objectiveId: text("objective_id"),
    activityType: text("activity_type"),
    activityId: text("activity_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    schemaVersion: integer("schema_version").notNull().default(1),
    idempotencyKey: text("idempotency_key"),
    occurredAt: tz("occurred_at").notNull().defaultNow(),
  },
  (t) => [
    index("events_user_time_idx").on(t.userId, t.occurredAt),
    index("events_user_course_idx").on(t.userId, t.courseId),
    uniqueIndex("events_idempotency_unique").on(t.userId, t.idempotencyKey),
  ],
);

export type ActivityKind = "lesson" | "practice" | "assessment" | "simulation";

/** A contiguous page visit; active time is accumulated from heartbeats. */
export const learningSessions = pgTable(
  "learning_sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id"),
    activityKind: text("activity_kind").$type<ActivityKind>().notNull(),
    activityId: text("activity_id"),
    startedAt: tz("started_at").notNull().defaultNow(),
    lastHeartbeatAt: tz("last_heartbeat_at").notNull().defaultNow(),
    /** Time the page was open and visible. */
    openMs: integer("open_ms").notNull().default(0),
    /** Open time minus idle gaps beyond the inactivity threshold. */
    activeMs: integer("active_ms").notNull().default(0),
  },
  (t) => [index("learning_sessions_user_idx").on(t.userId, t.startedAt)],
);

/** Per-day rollup so teacher dashboards never scan raw sessions. */
export const activityAggregates = pgTable(
  "activity_aggregates",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    day: date("day").notNull(),
    activityKind: text("activity_kind").$type<ActivityKind>().notNull(),
    openMs: integer("open_ms").notNull().default(0),
    activeMs: integer("active_ms").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId, t.day, t.activityKind] })],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    lessonVersion: integer("lesson_version").notNull(),
    /** Index of the furthest block the student has reached. */
    furthestBlock: integer("furthest_block").notNull().default(0),
    status: text("status").$type<"in_progress" | "completed">().notNull().default("in_progress"),
    startedAt: tz("started_at").notNull().defaultNow(),
    completedAt: tz("completed_at"),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] }), index("lesson_progress_course_idx").on(t.userId, t.courseId)],
);

// ════════════════════════════════ Classrooms ════════════════════════════════

export type AiPolicy = "allowed" | "hints_only" | "disabled";

export const classes = pgTable(
  "classes",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    courseVersionId: text("course_version_id")
      .notNull()
      .references(() => courseVersions.id),
    name: text("name").notNull(),
    joinCode: text("join_code").notNull(),
    /** AI tutor availability for ordinary (non-assessment) learning. */
    aiPolicy: text("ai_policy").$type<AiPolicy>().notNull().default("allowed"),
    createdAt: createdAt(),
    archivedAt: tz("archived_at"),
  },
  (t) => [uniqueIndex("classes_join_code_unique").on(t.joinCode), index("classes_teacher_idx").on(t.teacherId), index("classes_org_idx").on(t.organizationId)],
);

export const classEnrollments = pgTable(
  "class_enrollments",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").$type<"active" | "removed">().notNull().default("active"),
    joinedAt: tz("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.studentId] }), index("class_enrollments_student_idx").on(t.studentId)],
);

/** Independent (non-school) enrolment in a course. */
export const courseEnrollments = pgTable(
  "course_enrollments",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId] })],
);

/** Versioned mastery→grade conversion per class; history is never rewritten. */
export const gradingPolicies = pgTable(
  "grading_policies",
  {
    id: id(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    config: jsonb("config").$type<GradingPolicyConfig>().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("grading_policies_class_version_unique").on(t.classId, t.version)],
);

export type AssignmentKind = "lesson" | "skill_practice" | "assessment";

export const assignments = pgTable(
  "assignments",
  {
    id: id(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    instructions: text("instructions").notNull().default(""),
    kind: text("kind").$type<AssignmentKind>().notNull(),
    lessonId: text("lesson_id").references(() => lessons.id),
    assessmentId: text("assessment_id").references(() => assessments.id),
    /** Skills practised (skill_practice) or covered (others) — used for mastery grading. */
    skillIds: jsonb("skill_ids").$type<string[]>().notNull().default([]),
    /** Number of questions in a skill-practice set. */
    questionCount: integer("question_count").notNull().default(5),
    availableFrom: tz("available_from"),
    dueAt: tz("due_at"),
    maxAttempts: integer("max_attempts"),
    gradingMethod: text("grading_method").$type<"score" | "mastery" | "completion">().notNull().default("score"),
    points: integer("points").notNull().default(100),
    aiPolicy: text("ai_policy").$type<AiPolicy>().notNull().default("disabled"),
    feedback: text("feedback").$type<"immediate" | "after_submit">().notNull().default("after_submit"),
    createdAt: createdAt(),
    archivedAt: tz("archived_at"),
  },
  (t) => [index("assignments_class_idx").on(t.classId, t.dueAt)],
);

/** Rows present = assigned to selected students only; none = whole class. */
export const assignmentTargets = pgTable(
  "assignment_targets",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.assignmentId, t.studentId] }), index("assignment_targets_student_idx").on(t.studentId)],
);

/** Per-student accommodations. */
export const assignmentOverrides = pgTable(
  "assignment_overrides",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dueAt: tz("due_at"),
    maxAttempts: integer("max_attempts"),
    /** e.g. 1.5 = time-and-a-half on timed work. */
    timeMultiplier: doublePrecision("time_multiplier"),
    note: text("note").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.assignmentId, t.studentId] })],
);

export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attemptId: uuid("attempt_id").references(() => attempts.id, { onDelete: "set null" }),
    attemptNumber: integer("attempt_number").notNull().default(1),
    status: text("status").$type<"submitted" | "late">().notNull(),
    score: doublePrecision("score"),
    maxScore: doublePrecision("max_score"),
    submittedAt: tz("submitted_at").notNull().defaultNow(),
  },
  (t) => [index("submissions_assignment_idx").on(t.assignmentId, t.studentId)],
);

/** Teacher adjustments live here; the underlying evidence is never edited. */
export const gradebookEntries = pgTable(
  "gradebook_entries",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    overrideGrade: doublePrecision("override_grade"),
    overrideReason: text("override_reason"),
    overrideBy: uuid("override_by").references(() => users.id, { onDelete: "set null" }),
    overrideAt: tz("override_at"),
    comment: text("comment"),
    excused: boolean("excused").notNull().default(false),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.assignmentId, t.studentId] })],
);

// ══════════════════════════════ Knowledge vault ═════════════════════════════

export const vaultNotes = pgTable(
  "vault_notes",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    folder: text("folder").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("vault_notes_user_title_unique").on(t.userId, sql`lower(${t.title})`), index("vault_notes_user_idx").on(t.userId, t.updatedAt)],
);

/** Outgoing [[wiki links]] parsed from a note body on save. */
export const vaultLinks = pgTable(
  "vault_links",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => vaultNotes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    /** note: another note of the same owner · skill: a shared concept page. */
    targetType: text("target_type").$type<"note" | "skill" | "unresolved">().notNull(),
    targetId: text("target_id").notNull(),
    label: text("label").notNull(),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.targetType, t.targetId] }), index("vault_links_target_idx").on(t.userId, t.targetType, t.targetId)],
);

/** Explicit, revocable sharing of one note with one class's teacher. */
export const vaultShares = pgTable(
  "vault_shares",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => vaultNotes.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    sharedBy: uuid("shared_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.classId] })],
);

export const vaultExports = pgTable(
  "vault_exports",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    format: text("format").$type<"json" | "markdown">().notNull(),
    schemaVersion: text("schema_version").notNull(),
    counts: jsonb("counts").$type<Record<string, number>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("vault_exports_user_idx").on(t.userId)],
);

// ════════════════════════════════ Integrations ══════════════════════════════

export type LmsConnectionStatus = "not_configured" | "configured_unverified" | "verified" | "error";

export const lmsConnections = pgTable(
  "lms_connections",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    platform: text("platform").$type<"canvas">().notNull(),
    issuer: text("issuer").notNull(),
    clientId: text("client_id").notNull(),
    deploymentId: text("deployment_id").notNull(),
    authLoginUrl: text("auth_login_url").notNull(),
    authTokenUrl: text("auth_token_url").notNull(),
    jwksUrl: text("jwks_url").notNull(),
    status: text("status").$type<LmsConnectionStatus>().notNull().default("configured_unverified"),
    lastVerifiedAt: tz("last_verified_at"),
    lastError: text("last_error"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("lms_connections_unique").on(t.issuer, t.clientId, t.deploymentId), index("lms_connections_org_idx").on(t.organizationId)],
);

export const externalIdentityMappings = pgTable(
  "external_identity_mappings",
  {
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => lmsConnections.id, { onDelete: "cascade" }),
    externalUserId: text("external_user_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** How the link was established — never inferred from matching names. */
    linkedVia: text("linked_via").$type<"lti_launch_signed_in" | "admin_confirmed">().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.connectionId, t.externalUserId] })],
);

export const externalCourseMappings = pgTable(
  "external_course_mappings",
  {
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => lmsConnections.id, { onDelete: "cascade" }),
    externalCourseId: text("external_course_id").notNull(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    membershipsUrl: text("memberships_url"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.connectionId, t.externalCourseId] })],
);

export const externalAssignmentMappings = pgTable(
  "external_assignment_mappings",
  {
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => lmsConnections.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    resourceLinkId: text("resource_link_id").notNull(),
    lineItemUrl: text("line_item_url"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.connectionId, t.assignmentId] })],
);

/**
 * How a Canvas roster member relates to the class at review time:
 *  - already_linked   explicit identity link to a student actively enrolled in the class;
 *  - linked_elsewhere explicit identity link to an AceAP account that is NOT in the class
 *                     (that account is deliberately not recorded here);
 *  - suggested        no link; exact e-mail equality with exactly one student enrolled in
 *                     the class who has no link on this connection (never by name);
 *  - no_match         anything else.
 */
export type RosterMatchState = "already_linked" | "linked_elsewhere" | "suggested" | "no_match";

/**
 * Snapshot of a teacher-requested Canvas roster review (NRPS) — PROPOSALS ONLY.
 * Nothing here creates identity links or enrolments; linking stays
 * student-confirmed (/lti/link). Name and e-mail are stored only when the
 * platform sent them. Replaced on every review, purged after 30 days by the
 * retention job, and removed with the class or connection (cascade).
 * Service-only table: RLS on, no grants to aceap_app (drizzle/0005).
 */
export const lmsRosterProposals = pgTable(
  "lms_roster_proposals",
  {
    id: id(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => lmsConnections.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    externalUserId: text("external_user_id").notNull(),
    roles: jsonb("roles").$type<string[]>().notNull().default([]),
    status: text("status").$type<"active" | "inactive">().notNull(),
    name: text("name"),
    email: text("email"),
    matchState: text("match_state").$type<RosterMatchState>().notNull(),
    /** Set only for `suggested`: the enrolled student whose e-mail matched. */
    suggestedUserId: uuid("suggested_user_id").references(() => users.id, { onDelete: "cascade" }),
    /** Set only for `already_linked`: the enrolled student the member is linked to. */
    linkedUserId: uuid("linked_user_id").references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("lms_roster_proposals_unique").on(t.connectionId, t.classId, t.externalUserId),
    index("lms_roster_proposals_class_idx").on(t.classId),
    index("lms_roster_proposals_created_idx").on(t.createdAt),
  ],
);

export type SyncStatus = "pending" | "synced" | "failed" | "blocked";

export const syncJobs = pgTable(
  "sync_jobs",
  {
    id: id(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => lmsConnections.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"grade_passback">().notNull(),
    assignmentId: uuid("assignment_id").notNull(),
    studentId: uuid("student_id").notNull(),
    payload: jsonb("payload").$type<{ scoreGiven: number; scoreMaximum: number; comment?: string }>().notNull(),
    status: text("status").$type<SyncStatus>().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    /** assignment + student + grade hash — re-queuing the same grade is a no-op. */
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: createdAt(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
    syncedAt: tz("synced_at"),
  },
  (t) => [uniqueIndex("sync_jobs_idempotency_unique").on(t.idempotencyKey), index("sync_jobs_status_idx").on(t.connectionId, t.status)],
);

export const syncLogs = pgTable(
  "sync_logs",
  {
    id: id(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => syncJobs.id, { onDelete: "cascade" }),
    level: text("level").$type<"info" | "error">().notNull(),
    message: text("message").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sync_logs_job_idx").on(t.jobId)],
);

// ════════════════════════════════ Operational ═══════════════════════════════

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    organizationId: uuid("organization_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_actor_idx").on(t.actorId, t.createdAt), index("audit_logs_entity_idx").on(t.entityType, t.entityId)],
);

/** AI usage metering. Message text is deliberately not stored. */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    intent: text("intent").notNull(),
    contextKind: text("context_kind").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("ai_usage_user_idx").on(t.userId, t.createdAt)],
);

export const applicationSettings = pgTable("application_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: tz("updated_at").notNull().defaultNow(),
});

// ═════════════════════════════ Account lifecycle ════════════════════════════
// Service-only tables: RLS is enabled with no grants to aceap_app
// (drizzle/0003_account_lifecycle_rls.sql).

/** Single-use password-reset tokens. Only the SHA-256 of the token is stored. */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: tz("expires_at").notNull(),
    usedAt: tz("used_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("password_reset_tokens_hash_unique").on(t.tokenHash), index("password_reset_tokens_user_idx").on(t.userId)],
);

/**
 * Development email outbox: the "outbox" email adapter writes messages here
 * instead of delivering them (see src/modules/notifications/email.ts).
 */
export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: id(),
    fromAddress: text("from_address").notNull(),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    text: text("text").notNull(),
    html: text("html"),
    createdAt: createdAt(),
  },
  (t) => [index("email_outbox_created_idx").on(t.createdAt)],
);

/**
 * Shared sliding-window rate-limit buckets (src/lib/rate-limit.ts), so limits
 * hold across serverless instances. `hits` holds the epoch-millisecond times of
 * the allowed requests still inside the window. Service-only: row-level
 * security is on and the restricted role has no grants (migration 0007).
 * Rows past `expires_at` carry no state and are pruned opportunistically.
 */
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: text("key").primaryKey(),
    hits: bigint("hits", { mode: "number" }).array().notNull(),
    allowed: boolean("allowed").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limit_buckets_expires_idx").on(t.expiresAt)],
);

/**
 * LTI id_token nonces already used (replay protection shared across serverless
 * instances; src/modules/integrations/lms/lti/launch.ts → DatabaseNonceStore).
 * Service-only (migration 0009). A row past `expires_at` may be reused/pruned.
 */
export const ltiNonces = pgTable(
  "lti_nonces",
  {
    nonce: text("nonce").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("lti_nonces_expires_idx").on(t.expiresAt)],
);
