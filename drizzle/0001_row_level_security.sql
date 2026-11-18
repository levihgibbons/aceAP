-- AceAP row-level security.
--
-- The application connects as the table owner (trusted role) and switches to
-- the restricted role `aceap_app` for every user-scoped read (see asUser() in
-- src/db/client.ts). Identity arrives as transaction-local settings:
--   app.user_id   uuid of the signed-in user
--   app.user_role users.role of the signed-in user
--
-- aceap_app can never read: password hashes, sessions, answer keys
-- (question_versions), application settings.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aceap_app') THEN
    CREATE ROLE aceap_app NOLOGIN;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  EXECUTE format('GRANT aceap_app TO %I', current_user);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO aceap_app;
--> statement-breakpoint

-- ─────────────────────────── identity helpers ───────────────────────────────
CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_is_platform_admin() RETURNS boolean LANGUAGE sql STABLE AS
$$ SELECT COALESCE(current_setting('app.user_role', true), '') = 'platform_admin' $$;
--> statement-breakpoint

-- Teacher of the class, or school admin of the class's organisation.
CREATE OR REPLACE FUNCTION app_staff_of_class(cid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = cid AND (
      c.teacher_id = app_user_id()
      OR EXISTS (SELECT 1 FROM organization_memberships m
                 WHERE m.organization_id = c.organization_id AND m.user_id = app_user_id() AND m.role = 'school_admin')
    )
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_teaches_class(cid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM classes c WHERE c.id = cid AND c.teacher_id = app_user_id())
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_member_of_class(cid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM class_enrollments e
                 WHERE e.class_id = cid AND e.student_id = app_user_id() AND e.status = 'active')
$$;
--> statement-breakpoint

-- Staff may see a student's learning records only for the course of a class
-- that student is actively enrolled in and that the staff member is responsible for.
CREATE OR REPLACE FUNCTION app_staff_for_student_course(sid uuid, course text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM class_enrollments e JOIN classes c ON c.id = e.class_id
    WHERE e.student_id = sid AND e.status = 'active' AND c.archived_at IS NULL AND c.course_id = course
      AND (c.teacher_id = app_user_id()
           OR EXISTS (SELECT 1 FROM organization_memberships m
                      WHERE m.organization_id = c.organization_id AND m.user_id = app_user_id() AND m.role = 'school_admin'))
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_can_see_user(uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT uid = app_user_id()
    -- my students
    OR EXISTS (SELECT 1 FROM class_enrollments e JOIN classes c ON c.id = e.class_id
               WHERE e.student_id = uid AND e.status = 'active'
                 AND (c.teacher_id = app_user_id()
                      OR EXISTS (SELECT 1 FROM organization_memberships m
                                 WHERE m.organization_id = c.organization_id AND m.user_id = app_user_id() AND m.role = 'school_admin')))
    -- my teachers
    OR EXISTS (SELECT 1 FROM class_enrollments e JOIN classes c ON c.id = e.class_id
               WHERE c.teacher_id = uid AND e.student_id = app_user_id() AND e.status = 'active')
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_org_member(oid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM organization_memberships m WHERE m.organization_id = oid AND m.user_id = app_user_id())
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_org_staff(oid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM organization_memberships m
                 WHERE m.organization_id = oid AND m.user_id = app_user_id() AND m.role IN ('teacher', 'school_admin'))
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_staff_of_assignment(aid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM assignments a WHERE a.id = aid AND app_staff_of_class(a.class_id))
$$;
--> statement-breakpoint
-- An assignment reaches me if I am in the class and it targets everyone or me.
CREATE OR REPLACE FUNCTION app_assigned_to_me(aid uuid, cid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_member_of_class(cid) AND (
    NOT EXISTS (SELECT 1 FROM assignment_targets t WHERE t.assignment_id = aid)
    OR EXISTS (SELECT 1 FROM assignment_targets t WHERE t.assignment_id = aid AND t.student_id = app_user_id())
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_owns_note(nid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM vault_notes n WHERE n.id = nid AND n.user_id = app_user_id())
$$;
--> statement-breakpoint
-- A note is visible to a teacher only through an explicit share with their class,
-- and only while the note's owner is still actively enrolled in that class.
CREATE OR REPLACE FUNCTION app_note_shared_with_me(nid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM vault_shares s
                 JOIN classes c ON c.id = s.class_id
                 JOIN vault_notes n ON n.id = s.note_id
                 JOIN class_enrollments e ON e.class_id = c.id AND e.student_id = n.user_id AND e.status = 'active'
                 WHERE s.note_id = nid AND c.teacher_id = app_user_id() AND c.archived_at IS NULL)
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_connection_staff(conn uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM lms_connections l WHERE l.id = conn AND app_org_staff(l.organization_id))
$$;
--> statement-breakpoint

-- ───────────────────── shared curriculum & content (read-only) ──────────────
GRANT SELECT ON
  courses, course_versions, units, topics, learning_objectives, objective_mappings,
  skills, objective_skills, skill_prerequisites, skill_relationships, misconceptions,
  lessons, lesson_versions, lesson_skills, simulations, content_sources,
  questions, question_skills, assessments, assessment_items, mastery_policies
TO aceap_app;
--> statement-breakpoint

-- ──────────────────────────────── users ─────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT (id, name, email, role, is_demo, created_at) ON users TO aceap_app;
--> statement-breakpoint
CREATE POLICY users_visible ON users FOR SELECT TO aceap_app
  USING (app_can_see_user(id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE application_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE question_versions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- ───────────────────── per-student learning records ─────────────────────────
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON attempts TO aceap_app;
--> statement-breakpoint
CREATE POLICY attempts_read ON attempts FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_staff_for_student_course(user_id, course_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON question_responses TO aceap_app;
--> statement-breakpoint
CREATE POLICY responses_read ON question_responses FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_staff_for_student_course(user_id, course_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE hint_reveals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON hint_reveals TO aceap_app;
--> statement-breakpoint
CREATE POLICY hint_reveals_read ON hint_reveals FOR SELECT TO aceap_app
  USING (user_id = app_user_id());
--> statement-breakpoint
ALTER TABLE mastery_evidence ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON mastery_evidence TO aceap_app;
--> statement-breakpoint
CREATE POLICY evidence_read ON mastery_evidence FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_staff_for_student_course(user_id, course_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE mastery_states ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON mastery_states TO aceap_app;
--> statement-breakpoint
CREATE POLICY mastery_states_read ON mastery_states FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_staff_for_student_course(user_id, course_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE mastery_snapshots ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON mastery_snapshots TO aceap_app;
--> statement-breakpoint
CREATE POLICY mastery_snapshots_read ON mastery_snapshots FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_staff_for_student_course(user_id, course_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE detected_misconceptions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON detected_misconceptions TO aceap_app;
--> statement-breakpoint
CREATE POLICY detected_misconceptions_read ON detected_misconceptions FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_staff_for_student_course(user_id, course_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE review_schedule ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON review_schedule TO aceap_app;
--> statement-breakpoint
CREATE POLICY review_schedule_read ON review_schedule FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_staff_for_student_course(user_id, course_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON lesson_progress TO aceap_app;
--> statement-breakpoint
CREATE POLICY lesson_progress_read ON lesson_progress FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_staff_for_student_course(user_id, course_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE activity_aggregates ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON activity_aggregates TO aceap_app;
--> statement-breakpoint
CREATE POLICY activity_aggregates_read ON activity_aggregates FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_staff_for_student_course(user_id, course_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON learning_sessions TO aceap_app;
--> statement-breakpoint
CREATE POLICY learning_sessions_read ON learning_sessions FOR SELECT TO aceap_app
  USING (user_id = app_user_id()
         OR (course_id IS NOT NULL AND app_staff_for_student_course(user_id, course_id))
         OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON learning_events TO aceap_app;
--> statement-breakpoint
CREATE POLICY learning_events_read ON learning_events FOR SELECT TO aceap_app
  USING (user_id = app_user_id()
         OR (course_id IS NOT NULL AND app_staff_for_student_course(user_id, course_id))
         OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON course_enrollments TO aceap_app;
--> statement-breakpoint
CREATE POLICY course_enrollments_read ON course_enrollments FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_staff_for_student_course(user_id, course_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON ai_usage TO aceap_app;
--> statement-breakpoint
CREATE POLICY ai_usage_read ON ai_usage FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_is_platform_admin());
--> statement-breakpoint

-- ─────────────────────── organisations & classrooms ─────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON organizations TO aceap_app;
--> statement-breakpoint
CREATE POLICY organizations_read ON organizations FOR SELECT TO aceap_app
  USING (app_org_member(id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON organization_memberships TO aceap_app;
--> statement-breakpoint
CREATE POLICY organization_memberships_read ON organization_memberships FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_org_staff(organization_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON classes TO aceap_app;
--> statement-breakpoint
CREATE POLICY classes_read ON classes FOR SELECT TO aceap_app
  USING (app_staff_of_class(id) OR app_member_of_class(id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON class_enrollments TO aceap_app;
--> statement-breakpoint
CREATE POLICY class_enrollments_read ON class_enrollments FOR SELECT TO aceap_app
  USING (student_id = app_user_id() OR app_staff_of_class(class_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE grading_policies ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON grading_policies TO aceap_app;
--> statement-breakpoint
CREATE POLICY grading_policies_read ON grading_policies FOR SELECT TO aceap_app
  USING (app_staff_of_class(class_id) OR app_member_of_class(class_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON assignments TO aceap_app;
--> statement-breakpoint
CREATE POLICY assignments_read ON assignments FOR SELECT TO aceap_app
  USING (app_staff_of_class(class_id) OR app_assigned_to_me(id, class_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE assignment_targets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON assignment_targets TO aceap_app;
--> statement-breakpoint
CREATE POLICY assignment_targets_read ON assignment_targets FOR SELECT TO aceap_app
  USING (student_id = app_user_id() OR app_staff_of_assignment(assignment_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE assignment_overrides ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON assignment_overrides TO aceap_app;
--> statement-breakpoint
CREATE POLICY assignment_overrides_read ON assignment_overrides FOR SELECT TO aceap_app
  USING (student_id = app_user_id() OR app_staff_of_assignment(assignment_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON submissions TO aceap_app;
--> statement-breakpoint
CREATE POLICY submissions_read ON submissions FOR SELECT TO aceap_app
  USING (student_id = app_user_id() OR app_staff_of_assignment(assignment_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE gradebook_entries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON gradebook_entries TO aceap_app;
--> statement-breakpoint
CREATE POLICY gradebook_entries_read ON gradebook_entries FOR SELECT TO aceap_app
  USING (student_id = app_user_id() OR app_staff_of_assignment(assignment_id) OR app_is_platform_admin());
--> statement-breakpoint

-- ───────────────────────────── knowledge vault ──────────────────────────────
-- Notes belong to the student. There is deliberately NO staff or platform-admin
-- clause here: a teacher sees a note only via an explicit vault_shares row.
ALTER TABLE vault_notes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON vault_notes TO aceap_app;
--> statement-breakpoint
CREATE POLICY vault_notes_read ON vault_notes FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_note_shared_with_me(id));
--> statement-breakpoint
CREATE POLICY vault_notes_insert ON vault_notes FOR INSERT TO aceap_app
  WITH CHECK (user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY vault_notes_update ON vault_notes FOR UPDATE TO aceap_app
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY vault_notes_delete ON vault_notes FOR DELETE TO aceap_app
  USING (user_id = app_user_id());
--> statement-breakpoint
ALTER TABLE vault_links ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON vault_links TO aceap_app;
--> statement-breakpoint
CREATE POLICY vault_links_read ON vault_links FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_note_shared_with_me(note_id));
--> statement-breakpoint
CREATE POLICY vault_links_insert ON vault_links FOR INSERT TO aceap_app
  WITH CHECK (user_id = app_user_id() AND app_owns_note(note_id));
--> statement-breakpoint
CREATE POLICY vault_links_delete ON vault_links FOR DELETE TO aceap_app
  USING (user_id = app_user_id());
--> statement-breakpoint
ALTER TABLE vault_shares ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON vault_shares TO aceap_app;
--> statement-breakpoint
CREATE POLICY vault_shares_read ON vault_shares FOR SELECT TO aceap_app
  USING (shared_by = app_user_id() OR app_teaches_class(class_id));
--> statement-breakpoint
CREATE POLICY vault_shares_insert ON vault_shares FOR INSERT TO aceap_app
  WITH CHECK (shared_by = app_user_id() AND app_owns_note(note_id) AND app_member_of_class(class_id));
--> statement-breakpoint
CREATE POLICY vault_shares_delete ON vault_shares FOR DELETE TO aceap_app
  USING (shared_by = app_user_id());
--> statement-breakpoint
ALTER TABLE vault_exports ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON vault_exports TO aceap_app;
--> statement-breakpoint
CREATE POLICY vault_exports_read ON vault_exports FOR SELECT TO aceap_app
  USING (user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY vault_exports_insert ON vault_exports FOR INSERT TO aceap_app
  WITH CHECK (user_id = app_user_id());
--> statement-breakpoint

-- ─────────────────────── integrations & operations ──────────────────────────
ALTER TABLE lms_connections ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON lms_connections TO aceap_app;
--> statement-breakpoint
CREATE POLICY lms_connections_read ON lms_connections FOR SELECT TO aceap_app
  USING (app_org_staff(organization_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE external_identity_mappings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON external_identity_mappings TO aceap_app;
--> statement-breakpoint
CREATE POLICY external_identity_mappings_read ON external_identity_mappings FOR SELECT TO aceap_app
  USING (user_id = app_user_id() OR app_connection_staff(connection_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE external_course_mappings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON external_course_mappings TO aceap_app;
--> statement-breakpoint
CREATE POLICY external_course_mappings_read ON external_course_mappings FOR SELECT TO aceap_app
  USING (app_connection_staff(connection_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE external_assignment_mappings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON external_assignment_mappings TO aceap_app;
--> statement-breakpoint
CREATE POLICY external_assignment_mappings_read ON external_assignment_mappings FOR SELECT TO aceap_app
  USING (app_connection_staff(connection_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON sync_jobs TO aceap_app;
--> statement-breakpoint
CREATE POLICY sync_jobs_read ON sync_jobs FOR SELECT TO aceap_app
  USING (app_connection_staff(connection_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON sync_logs TO aceap_app;
--> statement-breakpoint
CREATE POLICY sync_logs_read ON sync_logs FOR SELECT TO aceap_app
  USING (EXISTS (SELECT 1 FROM sync_jobs j WHERE j.id = job_id) OR app_is_platform_admin());
--> statement-breakpoint
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON audit_logs TO aceap_app;
--> statement-breakpoint
CREATE POLICY audit_logs_read ON audit_logs FOR SELECT TO aceap_app
  USING (app_is_platform_admin() OR (organization_id IS NOT NULL AND app_org_staff(organization_id)));
--> statement-breakpoint
ALTER TABLE content_reviews ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON content_reviews TO aceap_app;
--> statement-breakpoint
CREATE POLICY content_reviews_read ON content_reviews FOR SELECT TO aceap_app
  USING (app_is_platform_admin());
