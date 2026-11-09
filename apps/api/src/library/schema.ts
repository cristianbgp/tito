import {
  bigint,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "../db/schema";
import type { DraftInput } from "../draft/contracts";
import type { PoolEntry, MatchNote, ReviewFeedback } from "./contracts";

export const heroPool = pgTable(
  "hero_pool",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    entries: jsonb("entries").$type<PoolEntry[]>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.role] }),
    check("hero_pool_role_valid", sql`${t.role} in ('1','2','3','4','5')`),
  ],
);
export const matchAnnotation = pgTable(
  "match_annotation",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    matchId: bigint("match_id", { mode: "bigint" }).notNull(),
    accountId: text("account_id").notNull(),
    note: jsonb("note").$type<MatchNote>(),
    feedback: jsonb("feedback").$type<ReviewFeedback>(),
    reviewGeneratedAt: text("review_generated_at"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.matchId] })],
);
export const draftSnapshot = pgTable("draft_snapshot", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id"),
  input: jsonb("input").$type<DraftInput>().notNull(),
  chosenHeroId: bigint("chosen_hero_id", { mode: "number" }),
  matchId: bigint("match_id", { mode: "bigint" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
