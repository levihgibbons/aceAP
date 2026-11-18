CREATE TABLE "lms_roster_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"external_user_id" text NOT NULL,
	"roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text NOT NULL,
	"name" text,
	"email" text,
	"match_state" text NOT NULL,
	"suggested_user_id" uuid,
	"linked_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lms_roster_proposals" ADD CONSTRAINT "lms_roster_proposals_connection_id_lms_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."lms_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_roster_proposals" ADD CONSTRAINT "lms_roster_proposals_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_roster_proposals" ADD CONSTRAINT "lms_roster_proposals_suggested_user_id_users_id_fk" FOREIGN KEY ("suggested_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_roster_proposals" ADD CONSTRAINT "lms_roster_proposals_linked_user_id_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lms_roster_proposals_unique" ON "lms_roster_proposals" USING btree ("connection_id","class_id","external_user_id");--> statement-breakpoint
CREATE INDEX "lms_roster_proposals_class_idx" ON "lms_roster_proposals" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "lms_roster_proposals_created_idx" ON "lms_roster_proposals" USING btree ("created_at");