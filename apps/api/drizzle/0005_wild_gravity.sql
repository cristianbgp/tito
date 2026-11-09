CREATE TABLE "hero_draft" (
	"user_id" text PRIMARY KEY NOT NULL,
	"lease_token" text,
	"lease_until" timestamp with time zone,
	"next_allowed_at" timestamp with time zone NOT NULL,
	"fingerprint" text,
	"data" jsonb
);
--> statement-breakpoint
ALTER TABLE "hero_draft" ADD CONSTRAINT "hero_draft_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;