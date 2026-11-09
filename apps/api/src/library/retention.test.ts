import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { and, count, eq } from "drizzle-orm";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { readConfig } from "../config";
import { playerMatch, playerSync } from "../history/schema";
import { matchReview } from "../review/schema";
import { validReview } from "../review/test-fixtures";
import { matchAnnotation } from "./schema";
import { LibraryService } from "./service";
import { noteInputSchema } from "./contracts";
let dir: string, database: Awaited<ReturnType<typeof createTestDatabase>>;
const now = Date.UTC(2026, 10, 7),
  old = new Date(now - 1000).toISOString();
const note = (text = "Keep this written note") =>
  noteInputSchema.parse({ text, tags: [] });
const service = () =>
  new LibraryService(database.db, readConfig({}), () => now);
const review = (matchId: bigint, generatedAt = new Date(now)) => ({
  userId: "cleanup",
  accountId: "222",
  matchId,
  fingerprint: String(matchId),
  generatedAt,
  data: {
    matchId: String(matchId),
    generatedAt: generatedAt.toISOString(),
    model: "controlled",
    promptVersion: "test",
    context: {
      hero: "Crystal Maiden",
      coverage: "summary" as const,
      comparableGames: 0,
      facts: [],
    },
    content: validReview(),
  },
});
const game = (userId: string, matchId: bigint) => ({
  userId,
  matchId,
  startedAt: now / 1000,
  duration: 1200,
  heroId: 5,
  hero: "Crystal Maiden",
});
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tito-library-retention-"));
  database = await createTestDatabase(dir);
  await database.db.insert(user).values(
    [
      ["archive", "111"],
      ["cleanup", "222"],
      ["full", "333"],
      ["feedbackcap", "444"],
    ].map(([id, accountId]) => ({
      id,
      name: id,
      email: `${id}@retention.invalid`,
      steamId: String(76561197960265728n + BigInt(accountId)),
    })),
  );
  await database.db.insert(playerSync).values(
    [
      ["archive", "111"],
      ["cleanup", "222"],
      ["full", "333"],
      ["feedbackcap", "444"],
    ].map(([userId, accountId]) => ({
      userId,
      accountId,
      lastAttemptAt: new Date(now),
      nextSyncAt: new Date(now),
    })),
  );
  await database.db
    .insert(playerMatch)
    .values([
      game("archive", 900n),
      game("archive", 901n),
      game("cleanup", 1200n),
      game("full", 1200n),
      game("full", 1000n),
      game("feedbackcap", 1200n),
    ]);
});
afterAll(async () => {
  await database?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});
it("keeps notes listable and deletable after their verified summaries are pruned", async () => {
  await service().putNote("archive", "111", "900", note());
  await database.db
    .delete(playerMatch)
    .where(
      and(eq(playerMatch.userId, "archive"), eq(playerMatch.matchId, 900n)),
    );
  expect(await service().notes("archive", "111")).toMatchObject([
    { matchId: "900", text: "Keep this written note" },
  ]);
  expect(await service().note("archive", "111", "900")).toMatchObject({
    matchId: "900",
  });
  expect(await service().notes("archive", "999")).toEqual([]);
  await service().deleteNote("cleanup", "222", "900");
  expect(await service().note("archive", "111", "900")).not.toBeNull();
  await service().deleteNote("archive", "111", "900");
  expect(await service().note("archive", "111", "900")).toBeNull();
});
it("recovers capacity from obsolete feedback while preserving all written notes and current feedback", async () => {
  await database.db.insert(matchAnnotation).values(
    Array.from({ length: 200 }, (_, i) => ({
      userId: "cleanup",
      accountId: "222",
      matchId: BigInt(1000 + i),
      note: i === 2 ? note("Persist across review pruning") : null,
      feedback: { rating: "useful" as const, comment: "" },
      reviewGeneratedAt: old,
      updatedAt: new Date(now),
    })),
  );
  // 1000 has been regenerated, 1001 still has its exact saved version; other reviews were pruned.
  await database.db
    .insert(matchReview)
    .values([review(1000n), review(1001n, new Date(old))]);
  await service().putNote(
    "cleanup",
    "222",
    "1200",
    note("New after capacity recovery"),
  );
  const rows = await database.db
    .select()
    .from(matchAnnotation)
    .where(eq(matchAnnotation.userId, "cleanup"));
  expect(rows.map((row) => String(row.matchId)).sort()).toEqual([
    "1001",
    "1002",
    "1200",
  ]);
  expect(await service().feedback("cleanup", "222", "1001")).toMatchObject({
    rating: "useful",
  });
  expect(await service().note("cleanup", "222", "1002")).toMatchObject({
    text: "Persist across review pruning",
  });
  await service().deleteFeedback("cleanup", "222", "1001");
  expect(await service().feedback("cleanup", "222", "1001")).toBeNull();
  expect(
    await database.db
      .select()
      .from(matchAnnotation)
      .where(
        and(
          eq(matchAnnotation.userId, "cleanup"),
          eq(matchAnnotation.matchId, 1001n),
        ),
      ),
  ).toEqual([]);
  await service().deleteFeedback("cleanup", "222", "1002");
  expect(await service().note("cleanup", "222", "1002")).toMatchObject({
    text: "Persist across review pruning",
  });
});
it("preserves previous-account written notes and explains how to manage them at capacity", async () => {
  await database.db.insert(matchAnnotation).values(
    Array.from({ length: 200 }, (_, i) => ({
      userId: "full",
      accountId: "999",
      matchId: BigInt(1000 + i),
      note: note("Archived-account writing"),
      updatedAt: new Date(now),
    })),
  );
  await expect(
    service().putNote("full", "333", "1200", note()),
  ).rejects.toMatchObject({
    status: 409,
    message: expect.stringMatching(/previous Steam account/i),
  });
  expect(
    (
      await database.db
        .select({ total: count() })
        .from(matchAnnotation)
        .where(eq(matchAnnotation.userId, "full"))
    )[0].total,
  ).toBe(200);
  // The primary key is user/match, so a same-match collision must not overwrite another account's writing.
  await expect(
    service().putNote("full", "333", "1000", note("Must not overwrite")),
  ).rejects.toMatchObject({ status: 409 });
  const [row] = await database.db
    .select()
    .from(matchAnnotation)
    .where(
      and(
        eq(matchAnnotation.userId, "full"),
        eq(matchAnnotation.matchId, 1000n),
      ),
    );
  expect(row).toMatchObject({
    accountId: "999",
    note: { text: "Archived-account writing" },
  });
  expect(await service().notes("full", "333")).toEqual([]);
});
it("allows clearing feedback only for the current session account and never deletes its written note", async () => {
  await database.db.insert(matchAnnotation).values({
    userId: "archive",
    accountId: "111",
    matchId: 901n,
    note: note("Preserve alongside feedback"),
    feedback: { rating: "incorrect", comment: "" },
    reviewGeneratedAt: old,
    updatedAt: new Date(now),
  });
  await service().deleteFeedback("cleanup", "222", "901");
  expect(
    (
      await database.db
        .select()
        .from(matchAnnotation)
        .where(
          and(
            eq(matchAnnotation.userId, "archive"),
            eq(matchAnnotation.matchId, 901n),
          ),
        )
    )[0].feedback,
  ).not.toBeNull();
  await expect(
    service().deleteFeedback("archive", "999", "901"),
  ).rejects.toMatchObject({ status: 403 });
  await service().deleteFeedback("archive", "111", "901");
  expect(await service().note("archive", "111", "901")).toMatchObject({
    text: "Preserve alongside feedback",
  });
});

it("allows explicit feedback removal to recover a full cap of current retained reviews", async () => {
  await database.db.insert(matchAnnotation).values(
    Array.from({ length: 200 }, (_, i) => ({
      userId: "feedbackcap",
      accountId: "444",
      matchId: BigInt(1000 + i),
      feedback: { rating: "useful" as const, comment: "" },
      reviewGeneratedAt: old,
      updatedAt: new Date(now),
    })),
  );
  await database.db.insert(matchReview).values(
    Array.from({ length: 200 }, (_, i) => ({
      ...review(BigInt(1000 + i), new Date(old)),
      userId: "feedbackcap",
      accountId: "444",
    })),
  );
  await expect(
    service().putNote("feedbackcap", "444", "1200", note()),
  ).rejects.toMatchObject({ status: 409 });
  await service().deleteFeedback("feedbackcap", "444", "1000");
  await service().putNote("feedbackcap", "444", "1200", note());
  expect(
    (
      await database.db
        .select({ total: count() })
        .from(matchAnnotation)
        .where(eq(matchAnnotation.userId, "feedbackcap"))
    )[0].total,
  ).toBe(200);
});
