import { heroPool } from "../library/schema";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { readConfig } from "../config";
import { DraftService } from "./service";
import { draftInputSchema } from "./contracts";
import type { DraftModel } from "./provider";
import { reviewAttempt, reviewBudget } from "../review/schema";
import { HistoryService } from "../history/service";
import { summary } from "../review/test-fixtures";
import { heroDraft } from "./schema";
let dir: string;
let database: Awaited<ReturnType<typeof createTestDatabase>>;
let now = Date.UTC(2026, 10, 7);
const input = () =>
  draftInputSchema.parse({
    role: "5",
    allies: [1, 2],
    enemies: [],
    bans: [],
    pool: [5, 20],
    useHistory: true,
  });
const evaluate = vi.fn<DraftModel["evaluate"]>(async (c) => ({
  ratings: c.candidates.map((h) => ({
    id: h.id,
    fit: 3,
    confidence: 0.8,
    reason: "role_fit",
    tradeoff: "limited_information",
  })),
  inputTokens: 2000,
}));
const config = readConfig({ OPENAI_API_KEY: "controlled" });
const service = (model: DraftModel | null = { evaluate }) =>
  new DraftService(database.db, model, config, () => now);
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tito-draft-"));
  database = await createTestDatabase(dir);
  await database.db.insert(user).values(
    [
      "one",
      "two",
      "race",
      "stale",
      "cache-race",
      "evidence",
      "blocked-evidence",
      "stale-evidence",
    ].map((id) => ({
      id,
      name: id,
      email: `${id}@draft.invalid`,
    })),
  );
});
it("sends bounded requested matchup observations into decisions and caches the evidence snapshot", async () => {
  const source = {
    heroMatchups: vi.fn(async () => ({
      status: "available" as const,
      data: [{ heroId: 5, gamesPlayed: 20, wins: 15, winRate: 0.75 }],
      fetchedAt: "2026-11-07T00:00:00Z",
      expiresAt: "2026-11-07T01:00:00Z",
      sourceUrl: "https://www.opendota.com/heroes/1/matchups",
    })),
  };
  const model = { evaluate: vi.fn(evaluate) };
  const s = new DraftService(database.db, model, config, () => now, source);
  const d = { ...input(), allies: [], enemies: [1], useEvidence: true };
  const result = await s.suggest("evidence", null, d);
  expect(model.evaluate.mock.calls[0]?.[0].evidence?.matchups[0]).toMatchObject(
    {
      candidateId: 5,
      enemyId: 1,
      games: 20,
      candidateWins: 5,
      observedWinRate: 0.25,
    },
  );
  expect(result.evidence).toMatchObject({ loadedEnemies: 1, matchups: 1 });
  await s.suggest("evidence", null, d);
  expect(model.evaluate).toHaveBeenCalledTimes(1);
});
afterAll(async () => {
  await database?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});
it("makes no paid call without a key and reuses canonical equivalent drafts without another reservation", async () => {
  await expect(
    service(null).suggest("one", null, input()),
  ).rejects.toMatchObject({ status: 503 });
  expect(evaluate).not.toHaveBeenCalled();
  const first = await service().suggest("one", null, input());
  expect(first.recommendations).toHaveLength(3);
  const again = await service().suggest("one", null, {
    ...input(),
    allies: [2, 1],
    useEvidence: false,
  });
  expect(again).toEqual(first);
  expect(evaluate).toHaveBeenCalledTimes(1);
  expect(
    await database.db
      .select()
      .from(reviewAttempt)
      .where(eq(reviewAttempt.userId, "one")),
  ).toHaveLength(1);
  now += 901000;
  await service().suggest("one", null, input());
  expect(evaluate).toHaveBeenCalledTimes(2);
});
it("does not load evidence for rejected allowance or disabled AI requests", async () => {
  const source = { heroMatchups: vi.fn() };
  const d = { ...input(), useEvidence: true, enemies: [3] };
  await expect(
    new DraftService(database.db, null, config, () => now, source).suggest(
      "blocked-evidence",
      null,
      d,
    ),
  ).rejects.toMatchObject({ status: 503 });
  await database.db.insert(reviewBudget).values({
    key: "user:draft:blocked-evidence",
    ownerId: "blocked-evidence",
    period: new Date(now).toISOString().slice(0, 10),
    usedMicros: 0,
    attempts: 1,
  });
  await expect(
    new DraftService(
      database.db,
      { evaluate },
      { ...config, draftUserDailyLimit: 1 },
      () => now,
      source,
    ).suggest("blocked-evidence", null, d),
  ).rejects.toMatchObject({ status: 429 });
  expect(source.heroMatchups).not.toHaveBeenCalled();
});
it("refunds a reserved AI cost when evidence outlives the fence before AI starts", async () => {
  const source = {
    heroMatchups: vi.fn(async () => {
      now += 21000;
      return {
        status: "unavailable" as const,
        data: null,
        fetchedAt: null,
        expiresAt: null,
        sourceUrl: "https://api.opendota.com/api/heroes/3/matchups",
      };
    }),
  };
  const before = evaluate.mock.calls.length;
  await expect(
    new DraftService(
      database.db,
      { evaluate },
      config,
      () => now,
      source,
    ).suggest("stale-evidence", null, {
      ...input(),
      enemies: [3],
      useEvidence: true,
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(evaluate).toHaveBeenCalledTimes(before);
  const [budget] = await database.db
    .select()
    .from(reviewBudget)
    .where(eq(reviewBudget.key, "user:draft:stale-evidence"));
  expect(budget).toMatchObject({ attempts: 1, usedMicros: 0 });
});
it("uses only the verified linked account's saved hero experience and respects opt-out", async () => {
  await new HistoryService(
    database.db,
    {
      historyMatches: async () => [
        summary({ heroId: 5 }),
        summary({ id: "901", heroId: 5 }),
      ],
    },
    { maxMatches: 100, cooldownSeconds: 60 },
  ).sync("two", "42", "latest");
  expect((await service().suggest("two", "99", input())).historyGames).toBe(0);
  now += 2100;
  const own = await service().suggest("two", "42", input());
  expect(own.historyGames).toBe(2);
  expect(own.personalized).toBe(true);
  expect(own.recommendations.find((r) => r.hero.id === 5)?.savedGames).toBe(2);
  now += 2100;
  expect(
    (await service().suggest("two", "42", { ...input(), useHistory: false }))
      .historyGames,
  ).toBe(0);
});
it("blocks concurrent paid work and preserves prior cache on generation failure", async () => {
  let release!: () => void;
  const wait = new Promise<void>((r) => (release = r));
  const slow = service({
    evaluate: async (c) => {
      await wait;
      return evaluate(c);
    },
  }).suggest("race", null, input());
  await vi.waitFor(async () =>
    expect(
      await database.db
        .select()
        .from(reviewAttempt)
        .where(eq(reviewAttempt.userId, "race")),
    ).toHaveLength(1),
  );
  await expect(
    service().suggest("race", null, { ...input(), enemies: [3] }),
  ).rejects.toMatchObject({ status: 429 });
  release();
  const saved = await slow;
  now += 2100;
  await expect(
    service({
      evaluate: async () => {
        throw new Error("controlled failure");
      },
    }).suggest("race", null, { ...input(), enemies: [3] }),
  ).rejects.toThrow("controlled failure");
  expect(await service().suggest("race", null, input())).toEqual(saved);
});
it("does not let an expired model writer replace a newer result", async () => {
  let release!: () => void;
  const wait = new Promise<void>((r) => (release = r));
  const first = service({
    evaluate: async (c) => {
      await wait;
      return evaluate(c);
    },
  }).suggest("stale", null, input());
  await vi.waitFor(async () =>
    expect(
      await database.db
        .select()
        .from(reviewAttempt)
        .where(eq(reviewAttempt.userId, "stale")),
    ).toHaveLength(1),
  );
  now += 21000;
  const next = await service().suggest("stale", null, {
    ...input(),
    enemies: [3],
  });
  release();
  await expect(first).rejects.toMatchObject({ status: 409 });
  expect(
    await service().suggest("stale", null, { ...input(), enemies: [3] }),
  ).toEqual(next);
});
it("rechecks the leased cache when another request finishes after an older cache read", async () => {
  let release!: () => void, signal!: () => void;
  const wait = new Promise<void>((r) => (release = r)),
    read = new Promise<void>((r) => (signal = r));
  let held = false;
  const delayed = new Proxy(database.db, {
    get(target, property) {
      if (property === "select")
        return () => ({
          from: (table: typeof heroDraft) => ({
            where: (condition: ReturnType<typeof eq>) => {
              const query = database.db.select().from(table).where(condition);
              return {
                then: (
                  resolve: (value: unknown) => unknown,
                  reject: (error: unknown) => unknown,
                ) =>
                  query
                    .then(async (rows) => {
                      if (!held) {
                        held = true;
                        signal();
                        await wait;
                      }
                      return rows;
                    })
                    .then(resolve, reject),
              };
            },
          }),
        });
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const pending = new DraftService(
    delayed,
    { evaluate },
    config,
    () => now,
  ).suggest("cache-race", null, input());
  await read;
  const first = await service().suggest("cache-race", null, input());
  now += 2100;
  release();
  expect(await pending).toEqual(first);
  expect(evaluate).toHaveBeenCalledTimes(1);
  expect(
    await database.db
      .select()
      .from(reviewAttempt)
      .where(eq(reviewAttempt.userId, "cache-race")),
  ).toHaveLength(1);
});

it("ranks the best draft fits beyond favorites and returns separate nonduplicate favorite alternatives", async () => {
  await database.db.insert(user).values({
    id: "mixed-recommendations",
    name: "Mixed",
    email: "mixed@draft.invalid",
  });
  const model: DraftModel = {
    evaluate: vi.fn<DraftModel["evaluate"]>(async (c) => ({
      ratings: c.candidates.map((h) => ({
        id: h.id,
        fit: h.favorite ? 2 : 4,
        confidence: 0.8,
        reason: "role_fit" as const,
        tradeoff: "limited_information" as const,
      })),
      inputTokens: 1000,
    })),
  };
  const result = await service(model).suggest(
    "mixed-recommendations",
    null,
    input(),
  );
  expect(result.recommendations).toHaveLength(3);
  expect(result.recommendations.every((r) => !r.favorite)).toBe(true);
  expect(
    result.favoriteRecommendations?.map((r) => r.hero.id).sort((a, b) => a - b),
  ).toEqual([5, 20]);
  expect(result.favoriteRecommendations?.every((r) => r.favorite)).toBe(true);
  expect(
    result.favoriteRecommendations?.some((r) =>
      result.recommendations.some((top) => top.hero.id === r.hero.id),
    ),
  ).toBe(false);
  expect(model.evaluate).toHaveBeenCalledTimes(1);
});

it("automatically includes only this user and role favorites, honors Avoid, and invalidates cached suggestions after preference edits", async () => {
  await database.db.insert(user).values([
    {
      id: "favorite-owner",
      name: "Private owner",
      email: "private-owner@draft.invalid",
    },
    {
      id: "favorite-other",
      name: "Other owner",
      email: "other-owner@draft.invalid",
    },
  ]);
  await database.db.insert(heroPool).values([
    {
      userId: "favorite-owner",
      role: "5",
      entries: [
        { heroId: 2, preference: "favorite" },
        { heroId: 5, preference: "avoid" },
        { heroId: 20, preference: "comfortable" },
      ],
      updatedAt: new Date(now),
    },
    {
      userId: "favorite-owner",
      role: "1",
      entries: [{ heroId: 1, preference: "favorite" }],
      updatedAt: new Date(now),
    },
    {
      userId: "favorite-other",
      role: "5",
      entries: [{ heroId: 4, preference: "favorite" }],
      updatedAt: new Date(now),
    },
  ]);
  const evaluate = vi.fn<DraftModel["evaluate"]>(async (c) => ({
    ratings: c.candidates.map((h) => ({
      id: h.id,
      fit: h.favorite ? 4 : 2,
      confidence: 0.8,
      reason: "role_fit",
      tradeoff: "limited_information",
    })),
    inputTokens: 1000,
  }));
  const d = { ...input(), allies: [], pool: [], useHistory: false };
  const s = service({ evaluate });
  const first = await s.suggest("favorite-owner", null, d);
  const context = evaluate.mock.calls[0]![0];
  expect(context.candidates.filter((h) => h.favorite).map((h) => h.id)).toEqual(
    [2],
  );
  expect(context.candidates.some((h) => h.id === 5)).toBe(false);
  expect(first.recommendations.find((r) => r.hero.id === 2)?.favorite).toBe(
    true,
  );
  expect(first.favoriteRecommendations).toEqual([]);
  expect(first.historyGames).toBe(0);
  expect(JSON.stringify(context)).not.toMatch(
    /favorite-owner|private-owner|accountId|steamId/,
  );
  await database.db
    .update(heroPool)
    .set({
      entries: [
        { heroId: 4, preference: "favorite" },
        { heroId: 5, preference: "avoid" },
      ],
      updatedAt: new Date(now),
    })
    .where(and(eq(heroPool.userId, "favorite-owner"), eq(heroPool.role, "5")));
  now += 2100;
  const changed = await s.suggest("favorite-owner", null, d);
  expect(evaluate).toHaveBeenCalledTimes(2);
  expect(changed.fingerprint).not.toBe(first.fingerprint);
  expect(
    evaluate.mock.calls[1]![0].candidates.filter((h) => h.favorite).map(
      (h) => h.id,
    ),
  ).toEqual([4]);
  const other = await s.suggest("favorite-other", null, d);
  expect(other.recommendations.find((r) => r.hero.id === 4)?.favorite).toBe(
    true,
  );
  expect(evaluate.mock.calls[2]![0].candidates.some((h) => h.id === 5)).toBe(
    true,
  );
});
