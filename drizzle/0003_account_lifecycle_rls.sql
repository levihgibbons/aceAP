-- Account lifecycle: row-level security for service-only tables.
--
-- password_reset_tokens and email_outbox are read and written only by the
-- trusted application role (password-reset service, email adapter, retention
-- job). The restricted role aceap_app gets NO grants and, with RLS enabled and
-- no policies, could see no rows even if a grant were added by mistake.
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON password_reset_tokens FROM aceap_app;
--> statement-breakpoint
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON email_outbox FROM aceap_app;
