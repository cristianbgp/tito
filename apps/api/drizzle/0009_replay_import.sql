CREATE TABLE "replay_match" (
	"user_id" text NOT NULL,
	"match_id" bigint NOT NULL,
	"data" jsonb NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "replay_match_user_id_match_id_pk" PRIMARY KEY("user_id","match_id")
);
--> statement-breakpoint
ALTER TABLE "player_match" ADD COLUMN "source" text DEFAULT 'opendota' NOT NULL;--> statement-breakpoint
ALTER TABLE "replay_match" ADD CONSTRAINT "replay_match_user_id_match_id_player_match_user_id_match_id_fk" FOREIGN KEY ("user_id","match_id") REFERENCES "public"."player_match"("user_id","match_id") ON DELETE cascade ON UPDATE no action;