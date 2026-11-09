CREATE TABLE "match_review" (
	"user_id" text NOT NULL,
	"match_id" bigint NOT NULL,
	"account_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"data" jsonb NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "match_review_user_id_match_id_pk" PRIMARY KEY("user_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "review_attempt" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"reserved_micros" bigint NOT NULL,
	"day" text NOT NULL,
	"month" text NOT NULL,
	"settled" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_budget" (
	"key" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"period" text NOT NULL,
	"used_micros" bigint NOT NULL,
	"attempts" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_control" (
	"user_id" text PRIMARY KEY NOT NULL,
	"lease_token" text,
	"lease_until" timestamp with time zone,
	"next_allowed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_review" ADD CONSTRAINT "match_review_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_attempt" ADD CONSTRAINT "review_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_budget" ADD CONSTRAINT "review_budget_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_control" ADD CONSTRAINT "review_control_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;