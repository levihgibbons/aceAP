CREATE TABLE "lti_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "lti_nonces_expires_idx" ON "lti_nonces" USING btree ("expires_at");