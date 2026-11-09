import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { eq, and, count } from "drizzle-orm";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { readConfig } from "../config";
import { playerMatch, playerSync } from "../history/schema";
import { matchReview, reviewBudget } from "../review/schema";
import { validReview } from "../review/test-fixtures";
import { draftSnapshot, matchAnnotation, heroPool } from "./schema";
import { LibraryService } from "./service";
import { HistoryService } from "../history/service";
import { summary } from "../review/test-fixtures";
import { draftSnapshotInputSchema, noteInputSchema } from "./contracts";
let dir: string, database: Awaited<ReturnType<typeof createTestDatabase>>;
const accounts: Record<string, string> = {
  one: "42",
  two: "99",
  cap: "43",
  race: "44",
  cascade: "45",
};
const now = Date.UTC(2026, 10, 7);
const config = readConfig({});
const service = () => new LibraryService(database.db, config, () => now);
const draft = () =>
  draftSnapshotInputSchema.parse({
    input: {
      role: "5",
      allies: [1],
      enemies: [],
      bans: [],
      pool: [5],
      useHistory: false,
    },
    chosenHeroId: 5,
  });
const note = () =>
  noteInputSchema.parse({
    text: "Remember this",
    tags: ["laning"],
    actualRole: "5",
    bookmarkSeconds: 0,
  });
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tito-library-"));
  database = await createTestDatabase(dir);
  await database.db.insert(user).values(
    ["one", "two", "cap", "race", "cascade"].map((id) => ({
      id,
      name: id,
      email: `${id}@library.invalid`,
      steamId: String(76561197960265728n + BigInt(accounts[id])),
    })),
  );
  await database.db.insert(playerSync).values(
    ["one", "two", "cap", "race", "cascade"].map((userId) => ({
      userId,
      accountId: accounts[userId],
      lastAttemptAt: new Date(now),
      nextSyncAt: new Date(now),
    })),
  );
  await database.db.insert(playerMatch).values(
    ["one", "two", "cap", "race", "cascade"].flatMap((userId) =>
      Array.from({ length: 205 }, (_, i) => ({
        userId,
        matchId: BigInt(900 + i),
        heroId: 5,
        hero: "Crystal Maiden",
        startedAt: now / 1000 - i * 1800,
        duration: 1200,
        result: i === 0 ? ("win" as const) : null,
        kills: i === 0 ? 0 : null,
        deaths: 0,
        assists: 2,
      })),
    ),
  );
  await database.db.insert(matchReview).values({
    userId: "one",
    accountId: "42",
    matchId: 900n,
    fingerprint: "review1",
    generatedAt: new Date(now),
    data: {
      matchId: "900",
      generatedAt: new Date(now).toISOString(),
      model: "controlled",
      promptVersion: "test",
      context: {
        hero: "Crystal Maiden",
        coverage: "summary",
        comparableGames: 0,
        facts: [],
      },
      content: validReview(),
    },
  });
});
afterAll(async () => {
  await database?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});
it("keeps five role pools private and replaces entries rather than accumulating", async () => {
  expect(await service().pools("one")).toHaveLength(5);
  await service().putPool("one", "5", {
    entries: [{ heroId: 5, preference: "learning" }],
  });
  expect((await service().pool("one", "5")).entries).toHaveLength(1);
  expect((await service().pool("two", "5")).entries).toEqual([]);
  await service().putPool("one", "5", { entries: [] });
  expect((await service().pool("one", "5")).entries).toEqual([]);
});
it("validates notes against current linked history, duration and session-owned identities", async () => {
  const saved = await service().putNote("one", "42", "900", note());
  expect(saved).toMatchObject({
    matchId: "900",
    bookmarkSeconds: 0,
    actualRole: "5",
  });
  expect(await service().note("two", "99", "900")).toBeNull();
  expect(await service().notes("one", "99")).toEqual([]);
  await expect(
    service().putNote("one", "99", "900", note()),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    service().putNote("one", "42", "999999", note()),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    service().putNote("one", "42", "900", { ...note(), bookmarkSeconds: 1201 }),
  ).rejects.toMatchObject({ status: 400 });
});
it("binds feedback to the user's saved review version", async () => {
  await expect(
    service().putFeedback("two", "99", "900", {
      rating: "useful",
      comment: "",
    }),
  ).rejects.toMatchObject({ status: 404 });
  await service().putFeedback("one", "42", "900", {
    rating: "incorrect",
    comment: "Check the summary",
  });
  expect(await service().feedback("one", "99", "900")).toBeNull();
  expect(await service().feedback("one", "42", "900")).toMatchObject({
    rating: "incorrect",
  });
  await database.db
    .update(matchReview)
    .set({ generatedAt: new Date(now + 1000) })
    .where(eq(matchReview.userId, "one"));
  expect(await service().feedback("one", "42", "900")).toBeNull();
});
it("uses explicit draft snapshots and keeps association and updates owned", async () => {
  const saved = await service().createDraft("one", "42", {
    ...draft(),
    matchId: "900",
  });
  expect((await service().drafts("one", "42"))[0]).toMatchObject({
    id: saved.id,
    chosenHeroId: 5,
    matchId: "900",
  });
  expect(await service().drafts("one", "99")).toEqual([]);
  expect(await service().drafts("two", "99")).toEqual([]);
  await expect(
    service().updateDraft("two", "99", saved.id, { chosenHeroId: null }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    service().updateDraft("one", "42", saved.id, { chosenHeroId: 1 }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    service().updateDraft("one", "42", saved.id, { matchId: "999999" }),
  ).rejects.toMatchObject({ status: 404 });
  expect(
    await service().updateDraft("one", "42", saved.id, {
      chosenHeroId: null,
      matchId: null,
    }),
  ).toMatchObject({ chosenHeroId: null, matchId: null });
});
it("reports only own UTC usage and preserves observed zero for hero detail and reflection", async () => {
  await database.db.insert(reviewBudget).values([
    {
      key: "user:one",
      ownerId: "one",
      period: "2026-11-07",
      usedMicros: 100000,
      attempts: 2,
    },
    {
      key: "user:two",
      ownerId: "two",
      period: "2026-11-07",
      usedMicros: 999999,
      attempts: 20,
    },
    {
      key: "global:day",
      period: "2026-11-07",
      usedMicros: 9999999,
      attempts: 100,
    },
    {
      key: "user:draft:one",
      ownerId: "one",
      period: "2026-11-06",
      usedMicros: 100000,
      attempts: 30,
    },
  ]);
  expect(await service().usage("one")).toMatchObject({
    reviews: { attempts: 2, remaining: 3, estimatedCostUsd: 0.1 },
    drafts: { attempts: 0 },
    coaching: { attempts: 0 },
  });
  const hero = await service().hero("one", "42", 5);
  expect(hero).toMatchObject({
    games: 205,
    kills: 0,
    deaths: 0,
    knownResults: 1,
    reviewedGames: 1,
    notedGames: 1,
  });
  expect(hero.matches[0]).toMatchObject({
    note: { text: "Remember this" },
    reviewExcerpt: expect.any(String),
  });
  expect(await service().heroes("one", "99")).toEqual([]);
  const reflection = await service().reflection("one", "42", {
    mode: "day",
    day: "2026-11-07",
  });
  expect(reflection).toMatchObject({ games: 1, kills: 0, wins: 1, losses: 0 });
});
it("enforces annotation and snapshot caps under competing writes, permitting updates at cap", async () => {
  await database.db.insert(matchAnnotation).values(
    Array.from({ length: 199 }, (_, i) => ({
      userId: "cap",
      matchId: BigInt(900 + i),
      accountId: "43",
      note: note(),
      updatedAt: new Date(now),
    })),
  );
  const outcomes = await Promise.allSettled([
    service().putNote("cap", "43", "1100", note()),
    service().putNote("cap", "43", "1101", note()),
  ]);
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.filter((r) => r.status === "rejected")).toMatchObject([
    { reason: { status: 409 } },
  ]);
  await service().putNote("cap", "43", "900", {
    ...note(),
    text: "Updated at capacity",
  });
  await database.db.insert(draftSnapshot).values(
    Array.from({ length: 49 }, (_, i) => ({
      id: crypto.randomUUID(),
      userId: "race",
      accountId: "44",
      input: draft().input,
      createdAt: new Date(now + i),
      updatedAt: new Date(now + i),
    })),
  );
  const draftResults = await Promise.allSettled([
    service().createDraft("race", "44", draft()),
    service().createDraft("race", "44", draft()),
  ]);
  expect(draftResults.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(draftResults.filter((r) => r.status === "rejected")).toMatchObject([
    { reason: { status: 409 } },
  ]);
  expect(
    (
      await database.db
        .select({ total: count() })
        .from(draftSnapshot)
        .where(eq(draftSnapshot.userId, "race"))
    )[0].total,
  ).toBe(50);
});
it("cascades user deletion across all library rows", async () => {
  await service().putPool("cascade", "1", { entries: [] });
  await service().putNote("cascade", "45", "900", note());
  await service().createDraft("cascade", "45", draft());
  await database.db.delete(user).where(eq(user.id, "cascade"));
  for (const table of [heroPool, matchAnnotation, draftSnapshot])
    expect(
      await database.db.select().from(table).where(eq(table.userId, "cascade")),
    ).toEqual([]);
});

it("projects only confirmed note roles into owned history and preserves explicit clears across provider resyncs", async () => {
  let clock = now + 61000;
  let providerRole: string | null = null;
  const history = new HistoryService(
    database.db,
    {
      historyMatches: async () => [
        summary({ id: "901", accountId: "99", actualRole: providerRole }),
      ],
    },
    { maxMatches: 1000, cooldownSeconds: 60, now: () => clock },
  );
  const readRole = async () =>
    (await history.read("two", "99", 1000)).matches.find(
      (match) => match.id === "901",
    )?.actualRole;
  expect(await readRole()).toBeNull();
  await service().putNote("two", "99", "901", { ...note(), actualRole: "4" });
  expect(await readRole()).toBe("4");
  const [snapshot] = await database.db
    .select()
    .from(playerMatch)
    .where(and(eq(playerMatch.userId, "two"), eq(playerMatch.matchId, 901n)));
  expect(snapshot.actualRole).toBe("4");
  expect((await history.read("two", "42", 1000)).matches).toEqual([]);
  await expect(service().deleteNote("two", "42", "901")).rejects.toMatchObject({
    status: 403,
  });
  expect(await readRole()).toBe("4");
  await history.sync("two", "99", "latest");
  expect(await readRole()).toBe("4");
  providerRole = "2";
  clock += 61000;
  await history.sync("two", "99", "latest");
  expect(await readRole()).toBe("4");
  await service().putNote("two", "99", "901", { ...note(), actualRole: null });
  expect(await readRole()).toBeNull();
  clock += 61000;
  await history.sync("two", "99", "latest");
  expect(await readRole()).toBeNull();
  await service().putNote("two", "99", "901", { ...note(), actualRole: "5" });
  await service().deleteNote("two", "99", "901");
  expect(await service().note("two", "99", "901")).toBeNull();
  expect(await readRole()).toBeNull();
  clock += 61000;
  await history.sync("two", "99", "latest");
  expect(await readRole()).toBeNull();
  // A previously unseen provider row must not acquire an inferred role either.
  const providerOnly = new HistoryService(
    database.db,
    {
      historyMatches: async () => [
        summary({ id: "2000", accountId: "99", actualRole: "3" }),
      ],
    },
    { maxMatches: 1000, cooldownSeconds: 60, now: () => clock + 61000 },
  );
  await providerOnly.sync("two", "99", "latest");
  expect(
    (await providerOnly.read("two", "99", 1000)).matches.find(
      (match) => match.id === "2000",
    )?.actualRole,
  ).toBeNull();
});

it("rechecks the current linked identity when a formerly valid session arrives after unlinking", async () => {
  await database.db
    .update(user)
    .set({ steamId: null })
    .where(eq(user.id, "one"));
  expect(await service().notes("one", "42")).toEqual([]);
  expect(await service().drafts("one", "42")).toEqual([]);
  expect(await service().feedback("one", "42", "900")).toBeNull();
  await expect(
    service().putNote("one", "42", "900", note()),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    service().createDraft("one", "42", draft()),
  ).rejects.toMatchObject({ status: 403 });
});
