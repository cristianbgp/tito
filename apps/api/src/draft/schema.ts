import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../db/schema";
import type { DraftResult } from "./contracts";
export const heroDraft = pgTable("hero_draft", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  leaseToken: text("lease_token"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  nextAllowedAt: timestamp("next_allowed_at", { withTimezone: true }).notNull(),
  fingerprint: text("fingerprint"),
  data: jsonb("data").$type<DraftResult>(),
});
