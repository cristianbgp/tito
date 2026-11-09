CREATE TABLE "draft_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text,
	"input" jsonb NOT NULL,
	"chosen_hero_id" bigint,
	"match_id" bigint,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_pool" (
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"entries" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "hero_pool_user_id_role_pk" PRIMARY KEY("user_id","role"),
	CONSTRAINT "hero_pool_role_valid" CHECK ("hero_pool"."role" in ('1','2','3','4','5'))
);
--> statement-breakpoint
CREATE TABLE "match_annotation" (
	"user_id" text NOT NULL,
	"match_id" bigint NOT NULL,
	"account_id" text NOT NULL,
	"note" jsonb,
	"feedback" jsonb,
	"review_generated_at" text,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "match_annotation_user_id_match_id_pk" PRIMARY KEY("user_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "coaching_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"lease_token" text,
	"lease_until" timestamp with time zone,
	"next_allowed_at" timestamp with time zone NOT NULL,
	"account_id" text NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_match" ADD COLUMN "game_mode" integer;--> statement-breakpoint
ALTER TABLE "player_match" ADD COLUMN "patch" integer;--> statement-breakpoint
ALTER TABLE "player_match" ADD COLUMN "actual_role" text;--> statement-breakpoint
ALTER TABLE "draft_snapshot" ADD CONSTRAINT "draft_snapshot_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_pool" ADD CONSTRAINT "hero_pool_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_annotation" ADD CONSTRAINT "match_annotation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_state" ADD CONSTRAINT "coaching_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;