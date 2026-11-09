import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { HistoryService } from "./service";
import { playerMatch, playerSync } from "./schema";
import type { z } from "zod";
import type { recentMatchSchema } from "../dota/schemas";

type Summary = z.infer<typeof recentMatchSchema>;
const game = (id: number, fields: Partial<Summary> = {}): Summary => ({
  id: String(id),
  accountId: "42",
  heroId: 1,
  hero: "Anti-Mage",
  heroImage: null,
  startedAt: 1700000000 + id,
  duration: 1800,
  result: "win",
  kills: 4,
  deaths: 2,
  assists: 8,
  goldPerMinute: 500,
  experiencePerMinute: null,
  ...fields,
});
let directory: string;
let database: Awaited<ReturnType<typeof createTestDatabase>>;
let clock = Date.UTC(2026, 10, 7);
const historyMatches =
  vi.fn<(id: string, offset: number) => Promise<Summary[]>>();
const service = () =>
  new HistoryService(
    database.db,
    { historyMatches },
    {
      maxMatches: 100,
      cooldownSeconds: 60,
      now: () => clock,
    },
  );
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "tito-history-"));
  database = await createTestDatabase(directory);
  await database.db.insert(user).values([
    { id: "first", name: "First", email: "first@history.invalid" },
    { id: "second", name: "Second", email: "second@history.invalid" },
    { id: "paging", name: "Paging", email: "paging@history.invalid" },
  ]);
});
afterAll(async () => {
  await database?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

it("saves only compact owned summaries, deduplicates, and preserves known nullable stats", async () => {
  historyMatches.mockResolvedValueOnce([
    game(2, { lobbyType: 7 }),
    game(1, { lobbyType: 0 }),
    game(2, { lobbyType: 7 }),
  ]);
  await service().sync("first", "42", "latest");
  let saved = await service().read("first", "42", 100);
  expect(saved.matches.map((m) => m.id)).toEqual(["2", "1"]);
  expect(saved.total).toBe(2);
  expect(saved.matches.find((m) => m.id === "1")?.lobbyType).toBe(0);
  expect(saved.lastSyncedAt).toBe(new Date(clock).toISOString());
  expect((await service().read("second", "42", 100)).matches).toEqual([]);
  expect((await service().read("first", "99", 100)).matches).toEqual([]);
  clock += 61_000;
  historyMatches.mockResolvedValueOnce([
    game(3),
    game(2, { kills: null, goldPerMinute: null }),
  ]);
  await service().sync("first", "42", "latest");
  saved = await service().read("first", "42", 100);
  expect(saved.total).toBe(3);
  expect(saved.matches.find((m) => m.id === "2")).toMatchObject({
    kills: 4,
    goldPerMinute: 500,
    lobbyType: 7,
  });
});

it("enforces a database cooldown across instances, including failures, without dropping saved rows", async () => {
  await expect(service().sync("first", "42", "latest")).rejects.toMatchObject({
    status: 429,
  });
  clock += 61_000;
  historyMatches.mockRejectedValueOnce(new Error("upstream unavailable"));
  await expect(service().sync("first", "42", "latest")).rejects.toThrow(
    "upstream unavailable",
  );
  expect((await service().read("first", "42", 100)).total).toBe(3);
  await expect(service().sync("first", "42", "latest")).rejects.toMatchObject({
    status: 429,
  });
});

it("bounds retention and pages older results only on explicit request", async () => {
  clock += 61_000;
  historyMatches.mockResolvedValueOnce(
    Array.from({ length: 100 }, (_, i) => game(300 - i)),
  );
  await service().sync("second", "42", "latest");
  const saved = await service().read("second", "42", 20);
  expect(saved.total).toBe(100);
  expect(saved.matches).toHaveLength(20);
  expect(saved.retentionLimit).toBe(100);
  clock += 61_000;
  await expect(service().sync("second", "42", "older")).rejects.toMatchObject({
    status: 409,
  });
  clock += 61_000;
  historyMatches.mockResolvedValueOnce([game(400)]);
  await service().sync("second", "42", "latest");
  const retained = await service().read("second", "42", 100);
  expect(retained.total).toBe(100);
  expect(retained.matches[0].id).toBe("400");
  expect(retained.matches.some((m) => m.id === "201")).toBe(false);
});

it("overlaps older pages and advances offsets after new matches arrive", async () => {
  const paging = new HistoryService(
    database.db,
    { historyMatches },
    { maxMatches: 1000, cooldownSeconds: 60, now: () => clock },
  );
  historyMatches.mockResolvedValueOnce(
    Array.from({ length: 100 }, (_, i) => game(400 - i)),
  );
  await paging.sync("paging", "42", "latest");
  clock += 61_000;
  historyMatches.mockResolvedValueOnce(
    Array.from({ length: 100 }, (_, i) => game(310 - i)),
  );
  await paging.sync("paging", "42", "older");
  expect(historyMatches).toHaveBeenLastCalledWith("42", 90);
  expect((await paging.read("paging", "42", 1000)).total).toBe(190);
  clock += 61_000;
  historyMatches.mockResolvedValueOnce([game(501), game(500), game(400)]);
  await paging.sync("paging", "42", "latest");
  clock += 61_000;
  historyMatches.mockResolvedValueOnce([game(212), game(211), game(210)]);
  const saved = await paging.sync("paging", "42", "older");
  expect(historyMatches).toHaveBeenLastCalledWith("42", 182);
  expect(saved.total).toBe(193);
  expect(saved.hasOlder).toBe(false);
});

it("fences expired writers and clears old-account summaries when the verified account changes", async () => {
  clock += 61_000;
  let release!: (matches: Summary[]) => void;
  historyMatches.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const olderWriter = service().sync("first", "42", "latest");
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  await expect(service().sync("first", "42", "latest")).rejects.toMatchObject({
    status: 429,
  });
  clock += 61_000;
  historyMatches.mockResolvedValueOnce([game(900, { accountId: "99" })]);
  await service().sync("first", "99", "latest");
  release([game(8)]);
  await expect(olderWriter).rejects.toMatchObject({ status: 409 });
  expect(
    (await service().read("first", "99", 100)).matches.map((m) => m.id),
  ).toEqual(["900"]);
  expect(
    await database.db
      .select()
      .from(playerMatch)
      .where(eq(playerMatch.userId, "first")),
  ).toHaveLength(1);
  await database.db.delete(user).where(eq(user.id, "first"));
  expect(
    await database.db
      .select()
      .from(playerSync)
      .where(eq(playerSync.userId, "first")),
  ).toHaveLength(0);
  expect(
    await database.db
      .select()
      .from(playerMatch)
      .where(eq(playerMatch.userId, "first")),
  ).toHaveLength(0);
});

it("aggregates every retained row independently of the match list's first 100 rows", async () => {
  await database.db.insert(user).values({
    id: "progress-sample",
    name: "Progress",
    email: "progress@history.invalid",
  });
  await database.db.insert(playerSync).values({
    userId: "progress-sample",
    accountId: "42",
    lastAttemptAt: new Date(clock),
    lastSyncedAt: new Date(clock),
    nextSyncAt: new Date(clock),
  });
  await database.db.insert(playerMatch).values(
    Array.from({ length: 101 }, (_, i) => ({
      userId: "progress-sample",
      matchId: BigInt(i + 1),
      startedAt: clock / 1000 - i * 3600,
      duration: 1800,
      heroId: 1,
      hero: "Anti-Mage",
      result: "win" as const,
      deaths: 0,
      goldPerMinute: 500,
    })),
  );
  const calls = historyMatches.mock.calls.length;
  const progressService = new HistoryService(
    database.db,
    { historyMatches },
    { maxMatches: 1000, cooldownSeconds: 60, now: () => clock },
  );
  expect(
    (await progressService.read("progress-sample", "42", 100)).matches,
  ).toHaveLength(100);
  expect(await progressService.progress("progress-sample", "42")).toMatchObject(
    {
      retainedMatches: 101,
      current: { stats: { games: 101, deaths: { value: 0, samples: 101 } } },
    },
  );
  expect(await progressService.progress("progress-sample", "99")).toMatchObject(
    { retainedMatches: 0, current: { stats: { games: 0 } } },
  );
  expect(historyMatches.mock.calls.length).toBe(calls);
});

it("uses recent overlapping games for routine sync and keeps the older-page cursor correct", async () => {
  await database.db
    .insert(user)
    .values({ id: "fast-sync", name: "Fast", email: "fast@history.invalid" });
  const archive = vi
    .fn()
    .mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => game(400 - i)))
    .mockResolvedValueOnce([game(308), game(307)]);
  const recent = vi
    .fn()
    .mockResolvedValueOnce([
      game(402),
      game(401),
      game(400, { kills: null, goldPerMinute: null }),
    ]);
  const fast = new HistoryService(
    database.db,
    { historyMatches: archive, recentMatches: recent },
    { maxMatches: 1000, cooldownSeconds: 60, now: () => clock },
  );
  await fast.sync("fast-sync", "42", "latest");
  expect(archive).toHaveBeenCalledTimes(1);
  expect(recent).not.toHaveBeenCalled();
  clock += 61_000;
  const synced = await fast.sync("fast-sync", "42", "latest");
  expect(recent).toHaveBeenCalledWith("42", true);
  expect(archive).toHaveBeenCalledTimes(1);
  expect(synced.total).toBe(102);
  expect(synced.hasOlder).toBe(true);
  expect(synced.matches.find((m) => m.id === "400")).toMatchObject({
    kills: 4,
    goldPerMinute: 500,
  });
  clock += 61_000;
  await fast.sync("fast-sync", "42", "older");
  expect(archive).toHaveBeenLastCalledWith("42", 92);
});

it("falls back to a full bounded page when recent games do not overlap, but never retries a failed fast request", async () => {
  await database.db
    .insert(user)
    .values({ id: "gap-sync", name: "Gap", email: "gap@history.invalid" });
  const archive = vi
    .fn()
    .mockResolvedValueOnce([game(400)])
    .mockResolvedValueOnce(
      Array.from({ length: 100 }, (_, i) => game(600 - i)),
    );
  const recent = vi
    .fn()
    .mockResolvedValueOnce(Array.from({ length: 20 }, (_, i) => game(600 - i)))
    .mockRejectedValueOnce(new Error("provider unavailable"));
  const fast = new HistoryService(
    database.db,
    { historyMatches: archive, recentMatches: recent },
    { maxMatches: 1000, cooldownSeconds: 60, now: () => clock },
  );
  await fast.sync("gap-sync", "42", "latest");
  clock += 61_000;
  const saved = await fast.sync("gap-sync", "42", "latest");
  expect(archive).toHaveBeenCalledTimes(2);
  expect(saved.matches[0].id).toBe("600");
  clock += 61_000;
  await expect(fast.sync("gap-sync", "42", "latest")).rejects.toThrow(
    "provider unavailable",
  );
  expect(archive).toHaveBeenCalledTimes(2);
  expect((await fast.read("gap-sync", "42", 100)).total).toBe(101);
});
