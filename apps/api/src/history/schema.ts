import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "../db/schema";

export const playerSync = pgTable("player_sync", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  nextSyncAt: timestamp("next_sync_at", { withTimezone: true }).notNull(),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  leaseToken: text("lease_token"),
  olderOffset: integer("older_offset").notNull().default(0),
  hasOlder: boolean("has_older").notNull().default(true),
});

// Compact per-player summaries avoid a shared metadata table and orphan cleanup.
export const playerMatch = pgTable(
  "player_match",
  {
    userId: text("user_id")
      .notNull()
      .references(() => playerSync.userId, { onDelete: "cascade" }),
    matchId: bigint("match_id", { mode: "bigint" }).notNull(),
    startedAt: bigint("started_at", { mode: "number" }).notNull(),
    duration: doublePrecision("duration").notNull(),
    heroId: integer("hero_id").notNull(),
    hero: text("hero").notNull(),
    gameMode: integer("game_mode"),
    lobbyType: integer("lobby_type"),
    patch: integer("patch"),
    actualRole: text("actual_role"),
    source: text("source", { enum: ["opendota", "replay"] })
      .default("opendota")
      .notNull(),
    heroImage: text("hero_image"),
    result: text("result", { enum: ["win", "loss"] }),
    kills: doublePrecision("kills"),
    deaths: doublePrecision("deaths"),
    assists: doublePrecision("assists"),
    goldPerMinute: doublePrecision("gold_per_minute"),
    experiencePerMinute: doublePrecision("experience_per_minute"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.matchId] }),
    check("player_match_result_valid", sql`${table.result} in ('win', 'loss')`),
  ],
);

export const providerBudget = pgTable("provider_budget", {
  key: text("key").primaryKey(),
  period: text("period").notNull(),
  used: integer("used").notNull(),
});
