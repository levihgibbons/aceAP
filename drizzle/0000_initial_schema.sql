CREATE TABLE "activity_aggregates" (
	"user_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"day" date NOT NULL,
	"activity_kind" text NOT NULL,
	"open_ms" integer DEFAULT 0 NOT NULL,
	"active_ms" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "activity_aggregates_user_id_course_id_day_activity_kind_pk" PRIMARY KEY("user_id","course_id","day","activity_kind")
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"intent" text NOT NULL,
	"context_kind" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_items" (
	"assessment_id" text NOT NULL,
	"question_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	CONSTRAINT "assessment_items_assessment_id_question_id_pk" PRIMARY KEY("assessment_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"unit_id" text,
	"topic_id" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"config" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_overrides" (
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"due_at" timestamp with time zone,
	"max_attempts" integer,
	"time_multiplier" double precision,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "assignment_overrides_assignment_id_student_id_pk" PRIMARY KEY("assignment_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "assignment_targets" (
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	CONSTRAINT "assignment_targets_assignment_id_student_id_pk" PRIMARY KEY("assignment_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"lesson_id" text,
	"assessment_id" text,
	"skill_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"question_count" integer DEFAULT 5 NOT NULL,
	"available_from" timestamp with time zone,
	"due_at" timestamp with time zone,
	"max_attempts" integer,
	"grading_method" text DEFAULT 'score' NOT NULL,
	"points" integer DEFAULT 100 NOT NULL,
	"ai_policy" text DEFAULT 'disabled' NOT NULL,
	"feedback" text DEFAULT 'after_submit' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"mode" text NOT NULL,
	"assessment_id" text,
	"assignment_id" uuid,
	"skill_id" text,
	"lesson_id" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"draft_answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"review_skill_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assistance" text DEFAULT 'allowed' NOT NULL,
	"feedback" text DEFAULT 'immediate' NOT NULL,
	"time_limit_seconds" integer,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"score" double precision,
	"max_score" double precision
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"organization_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_enrollments" (
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_enrollments_class_id_student_id_pk" PRIMARY KEY("class_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"course_version_id" text NOT NULL,
	"name" text NOT NULL,
	"join_code" text NOT NULL,
	"ai_policy" text DEFAULT 'allowed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "content_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"version" integer NOT NULL,
	"reviewer_id" uuid,
	"reviewer_label" text NOT NULL,
	"decision" text NOT NULL,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"provider" text NOT NULL,
	"url" text NOT NULL,
	"license" text NOT NULL,
	"attribution" text DEFAULT '' NOT NULL,
	"commercial_use" text NOT NULL,
	"modification" text NOT NULL,
	"usage" text NOT NULL,
	"approval_status" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"reviewed_on" date
);
--> statement-breakpoint
CREATE TABLE "course_enrollments" (
	"user_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_enrollments_user_id_course_id_pk" PRIMARY KEY("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "course_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"label" text NOT NULL,
	"alignment_source_url" text NOT NULL,
	"alignment_notes" text DEFAULT '' NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"availability" text DEFAULT 'active' NOT NULL,
	"availability_note" text,
	"content_status" text DEFAULT 'catalog_only' NOT NULL,
	"source_url" text NOT NULL,
	"catalog_verified_on" date,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detected_misconceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"misconception_id" text NOT NULL,
	"detection_method" text NOT NULL,
	"status" text DEFAULT 'hypothesis' NOT NULL,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"correct_since_last" integer DEFAULT 0 NOT NULL,
	"response_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"first_observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_assignment_mappings" (
	"connection_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"resource_link_id" text NOT NULL,
	"line_item_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_assignment_mappings_connection_id_assignment_id_pk" PRIMARY KEY("connection_id","assignment_id")
);
--> statement-breakpoint
CREATE TABLE "external_course_mappings" (
	"connection_id" uuid NOT NULL,
	"external_course_id" text NOT NULL,
	"class_id" uuid NOT NULL,
	"memberships_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_course_mappings_connection_id_external_course_id_pk" PRIMARY KEY("connection_id","external_course_id")
);
--> statement-breakpoint
CREATE TABLE "external_identity_mappings" (
	"connection_id" uuid NOT NULL,
	"external_user_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"linked_via" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_identity_mappings_connection_id_external_user_id_pk" PRIMARY KEY("connection_id","external_user_id")
);
--> statement-breakpoint
CREATE TABLE "gradebook_entries" (
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"override_grade" double precision,
	"override_reason" text,
	"override_by" uuid,
	"override_at" timestamp with time zone,
	"comment" text,
	"excused" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gradebook_entries_assignment_id_student_id_pk" PRIMARY KEY("assignment_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "grading_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hint_reveals" (
	"attempt_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"hints_revealed" integer DEFAULT 0 NOT NULL,
	"solution_viewed" boolean DEFAULT false NOT NULL,
	"tutor_used" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hint_reveals_attempt_id_question_id_pk" PRIMARY KEY("attempt_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "learning_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"type" text NOT NULL,
	"course_id" text,
	"skill_id" text,
	"objective_id" text,
	"activity_type" text,
	"activity_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"idempotency_key" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_objectives" (
	"id" text PRIMARY KEY NOT NULL,
	"topic_id" text NOT NULL,
	"course_id" text NOT NULL,
	"course_version_id" text NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" text,
	"activity_kind" text NOT NULL,
	"activity_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"open_ms" integer DEFAULT 0 NOT NULL,
	"active_ms" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" uuid NOT NULL,
	"lesson_id" text NOT NULL,
	"course_id" text NOT NULL,
	"lesson_version" integer NOT NULL,
	"furthest_block" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_skills" (
	"lesson_id" text NOT NULL,
	"skill_id" text NOT NULL,
	CONSTRAINT "lesson_skills_lesson_id_skill_id_pk" PRIMARY KEY("lesson_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_versions" (
	"lesson_id" text NOT NULL,
	"version" integer NOT NULL,
	"blocks" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"provenance" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "lesson_versions_lesson_id_version_pk" PRIMARY KEY("lesson_id","version")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"topic_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"course_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"est_minutes" integer NOT NULL,
	"published_version" integer
);
--> statement-breakpoint
CREATE TABLE "lms_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"issuer" text NOT NULL,
	"client_id" text NOT NULL,
	"deployment_id" text NOT NULL,
	"auth_login_url" text NOT NULL,
	"auth_token_url" text NOT NULL,
	"jwks_url" text NOT NULL,
	"status" text DEFAULT 'configured_unverified' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"last_error" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mastery_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"objective_id" text,
	"question_id" text NOT NULL,
	"question_version" integer NOT NULL,
	"pattern" text NOT NULL,
	"response_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"score" double precision NOT NULL,
	"difficulty" integer NOT NULL,
	"mode" text NOT NULL,
	"try_number" integer NOT NULL,
	"hints_used" integer NOT NULL,
	"solution_viewed" boolean NOT NULL,
	"tutor_used" boolean NOT NULL,
	"is_retention_review" boolean DEFAULT false NOT NULL,
	"scoring_version" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mastery_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mastery_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"course_id" text NOT NULL,
	"estimate" double precision NOT NULL,
	"level" text NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"alpha" double precision NOT NULL,
	"beta" double precision NOT NULL,
	"evidence_count" integer NOT NULL,
	"calc_version" text NOT NULL,
	"policy_id" uuid NOT NULL,
	"policy_version" integer NOT NULL,
	"trigger" text NOT NULL,
	"trigger_evidence_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mastery_states" (
	"user_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"course_id" text NOT NULL,
	"alpha" double precision NOT NULL,
	"beta" double precision NOT NULL,
	"estimate" double precision NOT NULL,
	"level" text NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"explanation" jsonb NOT NULL,
	"last_evidence_at" timestamp with time zone,
	"last_demonstrated_at" timestamp with time zone,
	"calc_version" text NOT NULL,
	"policy_id" uuid NOT NULL,
	"policy_version" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mastery_states_user_id_skill_id_pk" PRIMARY KEY("user_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "misconceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"remediation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objective_mappings" (
	"from_objective_id" text NOT NULL,
	"to_objective_id" text,
	"mapping_type" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	CONSTRAINT "objective_mappings_from_objective_id_mapping_type_pk" PRIMARY KEY("from_objective_id","mapping_type")
);
--> statement-breakpoint
CREATE TABLE "objective_skills" (
	"objective_id" text NOT NULL,
	"skill_id" text NOT NULL,
	CONSTRAINT "objective_skills_objective_id_skill_id_pk" PRIMARY KEY("objective_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_memberships_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"question_id" text NOT NULL,
	"question_version" integer NOT NULL,
	"response" jsonb NOT NULL,
	"score" double precision,
	"is_correct" boolean,
	"try_number" integer DEFAULT 1 NOT NULL,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"solution_viewed" boolean DEFAULT false NOT NULL,
	"tutor_used" boolean DEFAULT false NOT NULL,
	"misconception_id" text,
	"time_spent_ms" integer,
	"graded_by" text,
	"grading_version" text,
	"rubric_scores" jsonb,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"graded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "question_skills" (
	"question_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "question_skills_question_id_skill_id_pk" PRIMARY KEY("question_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "question_versions" (
	"question_id" text NOT NULL,
	"version" integer NOT NULL,
	"prompt" text NOT NULL,
	"body" jsonb NOT NULL,
	"hints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"solution" text NOT NULL,
	"stimulus" jsonb,
	"difficulty" integer NOT NULL,
	"pattern" text NOT NULL,
	"est_seconds" integer DEFAULT 90 NOT NULL,
	"content_hash" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"provenance" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_versions_question_id_version_pk" PRIMARY KEY("question_id","version")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"type" text NOT NULL,
	"published_version" integer,
	"primary_skill_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_schedule" (
	"user_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"course_id" text NOT NULL,
	"stage" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_schedule_user_id_skill_id_pk" PRIMARY KEY("user_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulations" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"name" text NOT NULL,
	"purpose" text NOT NULL,
	"variables" jsonb NOT NULL,
	"outputs" jsonb NOT NULL,
	"skill_ids" jsonb NOT NULL,
	"accessibility_alternative" text NOT NULL,
	"telemetry" text DEFAULT 'engagement_only' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_prerequisites" (
	"skill_id" text NOT NULL,
	"prerequisite_skill_id" text NOT NULL,
	CONSTRAINT "skill_prerequisites_skill_id_prerequisite_skill_id_pk" PRIMARY KEY("skill_id","prerequisite_skill_id")
);
--> statement-breakpoint
CREATE TABLE "skill_relationships" (
	"from_skill_id" text NOT NULL,
	"to_skill_id" text NOT NULL,
	"type" text NOT NULL,
	"rationale" text NOT NULL,
	CONSTRAINT "skill_relationships_from_skill_id_to_skill_id_type_pk" PRIMARY KEY("from_skill_id","to_skill_id","type")
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"difficulty" integer DEFAULT 3 NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pattern_labels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"attempt_id" uuid,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"status" text NOT NULL,
	"score" double precision,
	"max_score" double precision,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"course_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"course_version_id" text NOT NULL,
	"course_id" text NOT NULL,
	"number" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'outline' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vault_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"format" text NOT NULL,
	"schema_version" text NOT NULL,
	"counts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_links" (
	"note_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "vault_links_note_id_target_type_target_id_pk" PRIMARY KEY("note_id","target_type","target_id")
);
--> statement-breakpoint
CREATE TABLE "vault_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"folder" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_shares" (
	"note_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"shared_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vault_shares_note_id_class_id_pk" PRIMARY KEY("note_id","class_id")
);
--> statement-breakpoint
ALTER TABLE "activity_aggregates" ADD CONSTRAINT "activity_aggregates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_overrides" ADD CONSTRAINT "assignment_overrides_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_overrides" ADD CONSTRAINT "assignment_overrides_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_targets" ADD CONSTRAINT "assignment_targets_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_targets" ADD CONSTRAINT "assignment_targets_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_course_version_id_course_versions_id_fk" FOREIGN KEY ("course_version_id") REFERENCES "public"."course_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_versions" ADD CONSTRAINT "course_versions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detected_misconceptions" ADD CONSTRAINT "detected_misconceptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detected_misconceptions" ADD CONSTRAINT "detected_misconceptions_misconception_id_misconceptions_id_fk" FOREIGN KEY ("misconception_id") REFERENCES "public"."misconceptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_assignment_mappings" ADD CONSTRAINT "external_assignment_mappings_connection_id_lms_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."lms_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_assignment_mappings" ADD CONSTRAINT "external_assignment_mappings_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_course_mappings" ADD CONSTRAINT "external_course_mappings_connection_id_lms_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."lms_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_course_mappings" ADD CONSTRAINT "external_course_mappings_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_identity_mappings" ADD CONSTRAINT "external_identity_mappings_connection_id_lms_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."lms_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_identity_mappings" ADD CONSTRAINT "external_identity_mappings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_entries" ADD CONSTRAINT "gradebook_entries_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_entries" ADD CONSTRAINT "gradebook_entries_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_entries" ADD CONSTRAINT "gradebook_entries_override_by_users_id_fk" FOREIGN KEY ("override_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_policies" ADD CONSTRAINT "grading_policies_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_policies" ADD CONSTRAINT "grading_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hint_reveals" ADD CONSTRAINT "hint_reveals_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_objectives" ADD CONSTRAINT "learning_objectives_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_skills" ADD CONSTRAINT "lesson_skills_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_skills" ADD CONSTRAINT "lesson_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_connections" ADD CONSTRAINT "lms_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_connections" ADD CONSTRAINT "lms_connections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_evidence" ADD CONSTRAINT "mastery_evidence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_evidence" ADD CONSTRAINT "mastery_evidence_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_evidence" ADD CONSTRAINT "mastery_evidence_response_id_question_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."question_responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_policies" ADD CONSTRAINT "mastery_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_policies" ADD CONSTRAINT "mastery_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_snapshots" ADD CONSTRAINT "mastery_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_states" ADD CONSTRAINT "mastery_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_states" ADD CONSTRAINT "mastery_states_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "misconceptions" ADD CONSTRAINT "misconceptions_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_mappings" ADD CONSTRAINT "objective_mappings_from_objective_id_learning_objectives_id_fk" FOREIGN KEY ("from_objective_id") REFERENCES "public"."learning_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_mappings" ADD CONSTRAINT "objective_mappings_to_objective_id_learning_objectives_id_fk" FOREIGN KEY ("to_objective_id") REFERENCES "public"."learning_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_skills" ADD CONSTRAINT "objective_skills_objective_id_learning_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."learning_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_skills" ADD CONSTRAINT "objective_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_skills" ADD CONSTRAINT "question_skills_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_skills" ADD CONSTRAINT "question_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_primary_skill_id_skills_id_fk" FOREIGN KEY ("primary_skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_schedule" ADD CONSTRAINT "review_schedule_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_prerequisites" ADD CONSTRAINT "skill_prerequisites_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_prerequisites" ADD CONSTRAINT "skill_prerequisites_prerequisite_skill_id_skills_id_fk" FOREIGN KEY ("prerequisite_skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_relationships" ADD CONSTRAINT "skill_relationships_from_skill_id_skills_id_fk" FOREIGN KEY ("from_skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_relationships" ADD CONSTRAINT "skill_relationships_to_skill_id_skills_id_fk" FOREIGN KEY ("to_skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_connection_id_lms_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."lms_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_job_id_sync_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."sync_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_course_version_id_course_versions_id_fk" FOREIGN KEY ("course_version_id") REFERENCES "public"."course_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_exports" ADD CONSTRAINT "vault_exports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_links" ADD CONSTRAINT "vault_links_note_id_vault_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."vault_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_notes" ADD CONSTRAINT "vault_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_shares" ADD CONSTRAINT "vault_shares_note_id_vault_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."vault_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_shares" ADD CONSTRAINT "vault_shares_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_user_idx" ON "ai_usage" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "assessments_course_idx" ON "assessments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "assignment_targets_student_idx" ON "assignment_targets" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "assignments_class_idx" ON "assignments" USING btree ("class_id","due_at");--> statement-breakpoint
CREATE INDEX "attempts_user_idx" ON "attempts" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "attempts_assignment_idx" ON "attempts" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "attempts_user_course_idx" ON "attempts" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "class_enrollments_student_idx" ON "class_enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_join_code_unique" ON "classes" USING btree ("join_code");--> statement-breakpoint
CREATE INDEX "classes_teacher_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "classes_org_idx" ON "classes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "content_reviews_entity_idx" ON "content_reviews" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "course_versions_course_idx" ON "course_versions" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "detected_misconceptions_unique" ON "detected_misconceptions" USING btree ("user_id","misconception_id");--> statement-breakpoint
CREATE INDEX "detected_misc_skill_idx" ON "detected_misconceptions" USING btree ("user_id","skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grading_policies_class_version_unique" ON "grading_policies" USING btree ("class_id","version");--> statement-breakpoint
CREATE INDEX "events_user_time_idx" ON "learning_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "events_user_course_idx" ON "learning_events" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_idempotency_unique" ON "learning_events" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "objectives_topic_idx" ON "learning_objectives" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "objectives_course_idx" ON "learning_objectives" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "learning_sessions_user_idx" ON "learning_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "lesson_progress_course_idx" ON "lesson_progress" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "lesson_skills_skill_idx" ON "lesson_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "lessons_topic_idx" ON "lessons" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "lessons_course_idx" ON "lessons" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_connections_unique" ON "lms_connections" USING btree ("issuer","client_id","deployment_id");--> statement-breakpoint
CREATE INDEX "lms_connections_org_idx" ON "lms_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_response_skill_unique" ON "mastery_evidence" USING btree ("response_id","skill_id");--> statement-breakpoint
CREATE INDEX "evidence_user_skill_idx" ON "mastery_evidence" USING btree ("user_id","skill_id","occurred_at");--> statement-breakpoint
CREATE INDEX "evidence_user_course_idx" ON "mastery_evidence" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "mastery_policies_org_idx" ON "mastery_policies" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "snapshots_user_skill_idx" ON "mastery_snapshots" USING btree ("user_id","skill_id","created_at");--> statement-breakpoint
CREATE INDEX "mastery_states_course_idx" ON "mastery_states" USING btree ("course_id","user_id");--> statement-breakpoint
CREATE INDEX "misconceptions_skill_idx" ON "misconceptions" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "objective_skills_skill_idx" ON "objective_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "org_memberships_user_idx" ON "organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "responses_idempotency_unique" ON "question_responses" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "responses_attempt_idx" ON "question_responses" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "responses_user_question_idx" ON "question_responses" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE INDEX "question_skills_skill_idx" ON "question_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "questions_course_idx" ON "questions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "questions_primary_skill_idx" ON "questions" USING btree ("primary_skill_id");--> statement-breakpoint
CREATE INDEX "review_schedule_due_idx" ON "review_schedule" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "skills_course_idx" ON "skills" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "submissions_assignment_idx" ON "submissions" USING btree ("assignment_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_jobs_idempotency_unique" ON "sync_jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs" USING btree ("connection_id","status");--> statement-breakpoint
CREATE INDEX "sync_logs_job_idx" ON "sync_logs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "topics_unit_idx" ON "topics" USING btree ("unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "units_version_slug_unique" ON "units" USING btree ("course_version_id","slug");--> statement-breakpoint
CREATE INDEX "units_course_idx" ON "units" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "vault_exports_user_idx" ON "vault_exports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vault_links_target_idx" ON "vault_links" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vault_notes_user_title_unique" ON "vault_notes" USING btree ("user_id",lower("title"));--> statement-breakpoint
CREATE INDEX "vault_notes_user_idx" ON "vault_notes" USING btree ("user_id","updated_at");