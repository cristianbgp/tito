import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, expect, it } from "vitest";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { playerMatch } from "../history/schema";
import { eq } from "drizzle-orm";
import { HistoryService } from "../history/service";
import { normalizeReplay } from "./normalize";
import { replayData } from "./test-fixtures";
import { readReplay, saveReplay } from "./storage";

let directory: string;
let database: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "tito-replay-storage-"));
  database = await createTestDatabase(directory);
  await database.db
    .insert(user)
    .values({ id: "owner", name: "Owner", email: "owner@replay.invalid" });
});
afterAll(async () => {
  await database?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

it("saves private details and deduplicated owned history, preserving replay data during provider sync", async () => {
  const match = normalizeReplay(replayData(), "42");
  await saveReplay(database.db, "owner", "42", match, 100);
  await saveReplay(database.db, "owner", "42", match, 100);
  expect((await readReplay(database.db, "owner", "900"))?.source).toBe(
    "replay",
  );
  expect(await readReplay(database.db, "other", "900")).toBeNull();
  const source = {
    historyMatches: async () => [
      {
        id: "900",
        accountId: "42",
        heroId: 18,
        hero: "Sven",
        heroImage: null,
        startedAt: 1700000000,
        duration: 1800,
        result: "win" as const,
        kills: 99,
        deaths: 1,
        assists: 2,
        goldPerMinute: 400,
        experiencePerMinute: 500,
      },
    ],
  };
  const history = new HistoryService(database.db, source, {
    maxMatches: 100,
    cooldownSeconds: 60,
  });
  await history.sync("owner", "42", "latest");
  expect(await history.read("owner", "42", 100)).toMatchObject({
    total: 1,
    matches: [{ id: "900", source: "replay", kills: 0 }],
  });
});

it("rejects a mismatched player even if called outside the upload route", async () => {
  await expect(
    saveReplay(
      database.db,
      "owner",
      "999",
      normalizeReplay(replayData(), "42"),
      100,
    ),
  ).rejects.toThrow(/Steam account/);
});

it("retains the newest 50 replays and removes pruned private details by cascade", async () => {
  const [original] = await database.db
    .select()
    .from(playerMatch)
    .where(eq(playerMatch.userId, "owner"));
  await database.db.insert(playerMatch).values(
    Array.from({ length: 49 }, (_, i) => ({
      ...original,
      matchId: BigInt(901 + i),
    })),
  );
  const raw = { ...replayData(), match_id: 950 };
  await saveReplay(database.db, "owner", "42", normalizeReplay(raw, "42"), 100);
  const retained = await database.db
    .select()
    .from(playerMatch)
    .where(eq(playerMatch.userId, "owner"));
  expect(retained).toHaveLength(50);
  expect(await readReplay(database.db, "owner", "900")).toBeNull();
  expect((await readReplay(database.db, "owner", "950"))?.id).toBe("950");
  await expect(
    saveReplay(
      database.db,
      "owner",
      "42",
      normalizeReplay({ ...raw, match_id: 800 }, "42"),
      100,
    ),
  ).rejects.toMatchObject({ status: 409 });
});
