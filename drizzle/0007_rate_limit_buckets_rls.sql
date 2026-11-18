-- Shared rate-limit buckets: row-level security for a service-only table.
--
-- rate_limit_buckets is read and written only by the trusted application role
-- (src/lib/rate-limit.ts). The restricted role aceap_app gets NO grants and,
-- with RLS enabled and no policies, could see no rows even if a grant were
-- added by mistake.
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON rate_limit_buckets FROM aceap_app;
