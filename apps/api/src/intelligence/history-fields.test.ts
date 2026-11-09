import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { HistoryService } from "../history/service";
import type { z } from "zod";
import type { recentMatchSchema } from "../dota/schemas";

test("saved richer summaries preserve known game mode and patch when a later response omits them", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tito-summary-fields-"));
  const db = await createTestDatabase(directory);
  try {
    await db.db.insert(user).values({
      id: "summary",
      name: "Summary",
      email: "summary@test.invalid",
    });
    let now = Date.UTC(2026, 10, 7);
    let game: z.infer<typeof recentMatchSchema> = {
      id: "123",
      accountId: "42",
      heroId: 1,
      hero: "Anti-Mage",
      heroImage: null,
      result: "win",
      startedAt: 1700000000,
      duration: 1800,
      kills: 0,
      deaths: null,
      assists: null,
      goldPerMinute: null,
      experiencePerMinute: null,
      gameMode: 22,
      patch: 60,
      actualRole: null,
    };
    const service = new HistoryService(
      db.db,
      { historyMatches: async () => [game] },
      { maxMatches: 100, cooldownSeconds: 60, now: () => now },
    );
    await service.sync("summary", "42", "latest");
    now += 61_000;
    game = { ...game, gameMode: null, patch: null, actualRole: null };
    await service.sync("summary", "42", "latest");
    const saved = await service.read("summary", "42", 100);
    expect(saved.matches[0]).toMatchObject({
      gameMode: 22,
      patch: 60,
      actualRole: null,
      kills: 0,
      deaths: null,
    });
  } finally {
    await db.close();
    await rm(directory, { recursive: true, force: true });
  }
});
