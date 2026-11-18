-- LTI nonce replay store: row-level security for a service-only table.
-- Written only by the trusted application role (lti/launch.ts); the restricted
-- role aceap_app gets no grants and, with RLS on and no policies, sees no rows.
ALTER TABLE lti_nonces ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON lti_nonces FROM aceap_app;
