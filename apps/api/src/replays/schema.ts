import {
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  bigint,
  timestamp,
} from "drizzle-orm/pg-core";
import type { z } from "zod";
import type { matchDetailSchema } from "../dota/schemas";
import { playerMatch } from "../history/schema";

export const replayImportBudget = pgTable("replay_import_budget", {
  key: text("key").primaryKey(),
  used: integer("used").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const replayMatch = pgTable(
  "replay_match",
  {
    userId: text("user_id").notNull(),
    matchId: bigint("match_id", { mode: "bigint" }).notNull(),
    data: jsonb("data").$type<z.infer<typeof matchDetailSchema>>().notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.matchId] }),
    foreignKey({
      columns: [table.userId, table.matchId],
      foreignColumns: [playerMatch.userId, playerMatch.matchId],
    }).onDelete("cascade"),
  ],
);
