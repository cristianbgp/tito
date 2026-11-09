CREATE TABLE "player_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"account_id" text,
	"role" integer,
	"experience" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_profile_role_valid" CHECK ("player_profile"."role" between 1 and 5),
	CONSTRAINT "player_profile_experience_valid" CHECK ("player_profile"."experience" in ('beginner', 'intermediate', 'advanced'))
);
--> statement-breakpoint
ALTER TABLE "player_profile" ADD CONSTRAINT "player_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;