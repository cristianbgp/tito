import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../db/schema";
import type { SavedCoaching } from "./contracts";

// One bounded cache/control row per user. Successful entries survive failed calls.
export const coachingState = pgTable("coaching_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  leaseToken: text("lease_token"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  nextAllowedAt: timestamp("next_allowed_at", { withTimezone: true }).notNull(),
  accountId: text("account_id").notNull(),
  results: jsonb("results").$type<SavedCoaching[]>().notNull().default([]),
});
