CREATE TABLE "replay_import_budget" (
	"key" text PRIMARY KEY NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
