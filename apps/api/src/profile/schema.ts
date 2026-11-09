import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../db/schema";

export const playerProfile = pgTable(
  "player_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id"),
    role: integer("role"),
    experience: text("experience", {
      enum: ["beginner", "intermediate", "advanced"],
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("player_profile_role_valid", sql`${table.role} between 1 and 5`),
    check(
      "player_profile_experience_valid",
      sql`${table.experience} in ('beginner', 'intermediate', 'advanced')`,
    ),
  ],
);
