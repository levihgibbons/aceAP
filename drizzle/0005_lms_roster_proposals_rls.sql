-- Canvas roster review: row-level security for a service-only table.
--
-- lms_roster_proposals is read and written only by the trusted application
-- role (src/modules/integrations/lms/roster.ts, which authorises every caller
-- with assertClassStaff, and the retention job). The restricted role aceap_app
-- gets NO grants and, with RLS enabled and no policies, could see no rows even
-- if a grant were added by mistake.
ALTER TABLE lms_roster_proposals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON lms_roster_proposals FROM aceap_app;
