import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, expect, test, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { playerMatch, playerSync } from "../history/schema";
import { matchReview, reviewAttempt, reviewBudget } from "../review/schema";
import { reserveReview } from "../review/budget";
import { validReview } from "../review/test-fixtures";
import { readConfig } from "../config";
import { CoachingService } from "./service";
import { coachingState } from "./schema";
import type { CoachingModel } from "./provider";
let dir: string, database: Awaited<ReturnType<typeof createTestDatabase>>;
let now = Date.UTC(2026, 10, 7);
const config = readConfig({});
const generate = vi.fn<CoachingModel["generate"]>(async (c) => ({
  content: {
    text: "Review the replay to understand causes.",
    evidenceIds: c.evidence.slice(0, 1).map((e) => e.id),
    needsReplay: true,
  },
  usage: { input: 100, output: 50 },
}));
const service = (model: CoachingModel | null = { generate }) =>
  new CoachingService(database.db, model, config, () => now);
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tito-coaching-"));
  database = await createTestDatabase(dir);
  for (const id of ["one", "two", "race", "fence", "cap", "retain", "locale"]) {
    await database.db
      .insert(user)
      .values({ id, name: id, email: `${id}@coaching.invalid` });
    if (id !== "two") {
      await database.db.insert(playerSync).values({
        userId: id,
        accountId: "42",
        lastAttemptAt: new Date(now),
        nextSyncAt: new Date(now),
      });
      await database.db.insert(playerMatch).values(
        Array.from({ length: 10 }, (_, i) => ({
          userId: id,
          matchId: BigInt(100 - i),
          startedAt: now / 1000 - i * 3600,
          duration: 2400,
          heroId: 1,
          hero: "PRIVATE NAME",
          result: "win" as const,
          deaths: i < 5 ? 0 : 8,
          goldPerMinute: i < 5 ? 500 : 400,
        })),
      );
      await database.db.insert(matchReview).values({
        userId: id,
        accountId: "42",
        matchId: 100n,
        fingerprint: "review",
        generatedAt: new Date(now),
        data: {
          matchId: "100",
          generatedAt: new Date(now).toISOString(),
          model: config.reviewModel,
          promptVersion: "v1",
          context: {
            hero: "PRIVATE NAME",
            coverage: "summary",
            comparableGames: 0,
            facts: [
              {
                id: "match.deaths",
                metric: "deaths",
                value: 0,
                source: "match",
                samples: 1,
                atSeconds: null,
              },
            ],
          },
          content: validReview(),
        },
      });
    }
  }
});
afterAll(async () => {
  await database?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});
test("no-key insights verify saved history; private reads make no model calls", async () => {
  expect(
    (await service(null).read("one", "42")).insights.strengths.length,
  ).toBe(2);
  expect((await service(null).read("one", "99")).insights.verified).toBe(false);
  expect((await service(null).read("two", null)).insights.retainedMatches).toBe(
    0,
  );
  expect(
    (await service(null).readFollowUp("two", "42", "100")).answer,
  ).toBeNull();
  await expect(service(null).summarize("one", "42")).rejects.toMatchObject({
    status: 503,
  });
  expect(generate).not.toHaveBeenCalled();
});
test("cache reuses identical inputs, hides other owners and preserves valid answers after failure", async () => {
  const first = await service().summarize("one", "42");
  expect(first.summary).not.toBeNull();
  expect(generate).toHaveBeenCalledTimes(1);
  await service().summarize("one", "42");
  expect(generate).toHaveBeenCalledTimes(1);
  expect((await service(null).read("one", "42")).summary).not.toBeNull();
  expect((await service().read("two", "42")).summary).toBeNull();
  now += 11000;
  await service().followUp("one", "42", "100", { questionId: "focus" });
  now += 11000;
  generate.mockResolvedValueOnce({
    content: {
      text: "Invented event.",
      evidenceIds: ["unknown"],
      needsReplay: false,
    },
  });
  await expect(
    service().followUp("one", "42", "100", { questionId: "replay" }),
  ).rejects.toMatchObject({ status: 502 });
  expect(
    (await service().readFollowUp("one", "42", "100")).answer?.question,
  ).toBe("What should I focus on next?");
  await expect(
    service().followUp("two", "42", "100", { questionId: "focus" }),
  ).rejects.toMatchObject({ status: 409 });
  expect(JSON.stringify(generate.mock.calls)).not.toContain("PRIVATE NAME");
});
test("one in-flight request and fencing after expiry", async () => {
  let release!: () => void;
  const waiting = new Promise<void>((r) => (release = r));
  const delayed: CoachingModel = {
    generate: async (c) => {
      await waiting;
      return {
        content: {
          text: "OLD",
          evidenceIds: [c.evidence[0]!.id],
          needsReplay: true,
        },
      };
    },
  };
  const first = service(delayed).summarize("race", "42");
  await vi.waitFor(async () =>
    expect(
      await database.db
        .select()
        .from(reviewAttempt)
        .where(eq(reviewAttempt.userId, "race")),
    ).toHaveLength(1),
  );
  await expect(service().summarize("race", "42")).rejects.toMatchObject({
    status: 429,
  });
  now += 61000;
  await service().summarize("race", "42");
  release();
  await expect(first).rejects.toMatchObject({ status: 409 });
  expect((await service().read("race", "42")).summary?.content.text).not.toBe(
    "OLD",
  );
});
test("rechecks cached success in the leased row after an initially stale read", async () => {
  now += 11000;
  const before = await database.db.select().from(reviewAttempt);
  const racing = service();
  Object.assign(racing, { cached: async () => [] });
  const result = await racing.summarize("one", "42");
  expect(result.summary).not.toBeNull();
  expect(await database.db.select().from(reviewAttempt)).toHaveLength(
    before.length,
  );
});
test("coaching cap is separate from reviews and drafts, global spend is shared", async () => {
  for (let i = 0; i < 10; i++)
    await reserveReview(
      database.db,
      "cap",
      `cap-${i}`,
      1,
      { dailyCents: 50, monthlyCents: 500, userDaily: 10, scope: "coach" },
      now,
    );
  await expect(service().summarize("cap", "42")).rejects.toMatchObject({
    status: 429,
  });
  await reserveReview(
    database.db,
    "cap",
    "review-allowed",
    1,
    { dailyCents: 50, monthlyCents: 500, userDaily: 5 },
    now,
  );
  const [b] = await database.db
    .select()
    .from(reviewBudget)
    .where(eq(reviewBudget.key, "global:day"));
  expect(b.usedMicros).toBeGreaterThan(11);
  const capped = new CoachingService(
    database.db,
    { generate },
    { ...config, reviewDailyBudgetCents: 0 },
    () => now,
  );
  await expect(capped.summarize("fence", "42")).rejects.toMatchObject({
    status: 429,
  });
});
test("bounded cache retains twenty successes", async () => {
  for (let i = 0; i < 21; i++) {
    // Reset user allowance and advance cooldown; changing facts changes the canonical fingerprint.
    now += 11000;
    await database.db
      .delete(reviewBudget)
      .where(eq(reviewBudget.key, "user:coach:retain"));
    await database.db
      .update(playerMatch)
      .set({ goldPerMinute: 500 + i })
      .where(
        and(eq(playerMatch.userId, "retain"), eq(playerMatch.matchId, 100n)),
      );
    await service().summarize("retain", "42");
  }
  const [row] = await database.db
    .select()
    .from(coachingState)
    .where(eq(coachingState.userId, "retain"));
  expect(row.results).toHaveLength(20);
});

test("coaching summary and follow-up cache separate authored languages", async () => {
  const first = await service().summarize("locale", "42");
  expect(first.summary.locale).toBe("en");
  now += 11000;
  const spanish = await service().summarize("locale", "42", "es");
  expect(spanish.summary.locale).toBe("es");
  expect(spanish.summary.fingerprint).not.toBe(first.summary.fingerprint);
  expect(generate).toHaveBeenLastCalledWith(
    expect.anything(),
    config.reviewModel,
    "es",
  );
  await service().summarize("locale", "42", "es");
  expect(generate).toHaveBeenCalledTimes(2);
  now += 11000;
  const follow = await service().followUp(
    "locale",
    "42",
    "100",
    { questionId: "focus" },
    "es",
  );
  expect(follow.answer.locale).toBe("es");
  expect(generate).toHaveBeenLastCalledWith(
    expect.anything(),
    config.reviewModel,
    "es",
  );
});
