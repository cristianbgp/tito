import {
  bigint,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "../db/schema";
import type { SavedReview } from "./contracts";

export const matchReview = pgTable(
  "match_review",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    matchId: bigint("match_id", { mode: "bigint" }).notNull(),
    accountId: text("account_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    data: jsonb("data").$type<SavedReview>().notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.matchId] })],
);
export const reviewControl = pgTable("review_control", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  leaseToken: text("lease_token"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  nextAllowedAt: timestamp("next_allowed_at", { withTimezone: true }).notNull(),
});
export const reviewBudget = pgTable("review_budget", {
  key: text("key").primaryKey(),
  ownerId: text("owner_id").references(() => user.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  usedMicros: bigint("used_micros", { mode: "number" }).notNull(),
  attempts: integer("attempts").notNull(),
});
export const reviewAttempt = pgTable("review_attempt", {
  token: text("token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reservedMicros: bigint("reserved_micros", { mode: "number" }).notNull(),
  userBudgetKey: text("user_budget_key"),
  day: text("day").notNull(),
  month: text("month").notNull(),
  settled: integer("settled").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
