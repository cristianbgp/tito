import { lt, sql } from "drizzle-orm";
import type { Database } from "../db";
import { replayImportBudget } from "./schema";
import { ReplayError } from "./errors";
export async function claimReplayImport(
  db: Database,
  owner: string,
  userLimit: number,
  globalLimit: number,
) {
  const now = new Date(),
    day = now.toISOString().slice(0, 10),
    expiresAt = new Date(+now + 2 * 86400_000);
  await db.transaction(async (tx) => {
    await tx
      .delete(replayImportBudget)
      .where(lt(replayImportBudget.expiresAt, now));
    for (const [key, limit] of [
      [`global:${day}`, globalLimit],
      [`user:${owner}:${day}`, userLimit],
    ] as const) {
      if (limit < 1)
        throw new ReplayError(
          "The daily replay import limit has been reached. Try again tomorrow.",
          429,
        );
      const [row] = await tx
        .insert(replayImportBudget)
        .values({ key, used: 1, expiresAt })
        .onConflictDoUpdate({
          target: replayImportBudget.key,
          set: { used: sql`${replayImportBudget.used} + 1` },
          setWhere: lt(replayImportBudget.used, limit),
        })
        .returning();
      if (!row)
        throw new ReplayError(
          "The daily replay import limit has been reached. Try again tomorrow.",
          429,
        );
    }
  });
}
