CREATE TABLE "player_match" (
	"user_id" text NOT NULL,
	"match_id" bigint NOT NULL,
	"started_at" bigint NOT NULL,
	"duration" double precision NOT NULL,
	"hero_id" integer NOT NULL,
	"hero" text NOT NULL,
	"hero_image" text,
	"result" text,
	"kills" double precision,
	"deaths" double precision,
	"assists" double precision,
	"gold_per_minute" double precision,
	"experience_per_minute" double precision,
	CONSTRAINT "player_match_user_id_match_id_pk" PRIMARY KEY("user_id","match_id"),
	CONSTRAINT "player_match_result_valid" CHECK ("player_match"."result" in ('win', 'loss'))
);
--> statement-breakpoint
CREATE TABLE "player_sync" (
	"user_id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"last_attempt_at" timestamp with time zone NOT NULL,
	"last_synced_at" timestamp with time zone,
	"next_sync_at" timestamp with time zone NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_token" text,
	"older_offset" integer DEFAULT 0 NOT NULL,
	"has_older" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_budget" (
	"key" text PRIMARY KEY NOT NULL,
	"period" text NOT NULL,
	"used" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_match" ADD CONSTRAINT "player_match_user_id_player_sync_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."player_sync"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_sync" ADD CONSTRAINT "player_sync_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;