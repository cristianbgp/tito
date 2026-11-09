import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { readConfig } from "../config";
import { ReviewService } from "./service";
import { reviewAttempt, matchReview } from "./schema";
import { detail, validReview } from "./test-fixtures";
import { summary } from "./test-fixtures";
import { HistoryService } from "../history/service";
import { DataError } from "../dota/opendota";
import type { ReviewModel } from "./provider";
let dir: string;
let database: Awaited<ReturnType<typeof createTestDatabase>>;
let now = Date.UTC(2026, 10, 7);
const match = vi.fn(async () => detail());
const generate = vi.fn<ReviewModel["generate"]>(async () => ({
  content: validReview(),
  usage: { input: 1000, output: 400 },
}));
const config = readConfig({ OPENAI_API_KEY: "fake" });
const service = (model: ReviewModel | null = { generate }) =>
  new ReviewService(database.db, { match }, model, config, () => now);
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tito-review-service-"));
  database = await createTestDatabase(dir);
  await database.db
    .insert(user)
    .values(
      [
        "one",
        "two",
        "race",
        "fence",
        "fallback",
        "retain",
        "slow",
        "locale",
      ].map((id) => ({ id, name: id, email: `${id}@review.invalid` })),
    );
});
afterAll(async () => {
  await database?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});
it("does not call providers on reads or missing-key generation, and keeps records private", async () => {
  expect(await service(null).read("one", "42", "900")).toEqual({
    enabled: false,
    review: null,
  });
  await expect(
    service(null).generate("one", "42", "900"),
  ).rejects.toMatchObject({ status: 503 });
  expect(match).not.toHaveBeenCalled();
  expect(generate).not.toHaveBeenCalled();
  const result = await service().generate("one", "42", "900");
  expect(result.review?.promptVersion).toBe("match-review-v3");
  expect(result.review?.content).toEqual(validReview());
  expect((await service(null).read("one", "42", "900")).review).not.toBeNull();
  expect((await service().read("two", "42", "900")).review).toBeNull();
  expect((await service().read("one", "99", "900")).review).toBeNull();
  expect(generate).toHaveBeenCalledTimes(1);
  const before = match.mock.calls.length;
  await service().read("one", "42", "900");
  expect(match).toHaveBeenCalledTimes(before);
});
it("reuses unchanged evidence without new AI budget and preserves a prior review on invalid refresh", async () => {
  now += 61000;
  await service().generate("one", "42", "900");
  expect(generate).not.toHaveBeenCalled();
  now += 61000;
  const changed = detail();
  changed.players[0].kills = 5;
  match.mockResolvedValueOnce(changed);
  generate.mockResolvedValueOnce({
    content: {
      ...validReview(),
      improve: [
        { title: "Invalid", action: "Invented", evidenceIds: ["unknown"] },
      ],
    },
  });
  await expect(service().generate("one", "42", "900")).rejects.toMatchObject({
    status: 502,
  });
  expect((await service().read("one", "42", "900")).review?.content).toEqual(
    validReview(),
  );
  expect(await database.db.select().from(reviewAttempt)).toHaveLength(2);
});
it("rejects another account before model budget reservation", async () => {
  const before = await database.db.select().from(reviewAttempt);
  await expect(service().generate("two", "99", "900")).rejects.toMatchObject({
    status: 403,
  });
  expect(await database.db.select().from(reviewAttempt)).toHaveLength(
    before.length,
  );
});
it("allows only one in-flight generation per user across matches and instances", async () => {
  let release!: () => void;
  const wait = new Promise<void>((r) => (release = r));
  const first = service({
    generate: async () => {
      await wait;
      return { content: validReview() };
    },
  }).generate("race", "42", "900");
  await vi.waitFor(async () =>
    expect(
      await database.db
        .select()
        .from(reviewAttempt)
        .where(eq(reviewAttempt.userId, "race")),
    ).toHaveLength(1),
  );
  await expect(service().generate("race", "42", "901")).rejects.toMatchObject({
    status: 429,
  });
  release();
  await first;
});
it("fences an expired writer so it cannot overwrite its successor", async () => {
  let release!: () => void;
  const wait = new Promise<void>((r) => (release = r));
  const first = service({
    generate: async () => {
      await wait;
      return { content: { ...validReview(), summary: "OLD" } };
    },
  }).generate("fence", "42", "900");
  await vi.waitFor(async () =>
    expect(
      await database.db
        .select()
        .from(reviewAttempt)
        .where(eq(reviewAttempt.userId, "fence")),
    ).toHaveLength(1),
  );
  now += 91000;
  await service().generate("fence", "42", "900");
  release();
  await expect(first).rejects.toMatchObject({ status: 409 });
  const [saved] = await database.db
    .select()
    .from(matchReview)
    .where(eq(matchReview.userId, "fence"));
  expect(saved.data.content.summary).toBe(validReview().summary);
});
it("reviews an owned saved summary during an OpenDota outage", async () => {
  await new HistoryService(
    database.db,
    { historyMatches: async () => [summary()] },
    { maxMatches: 100, cooldownSeconds: 60 },
  ).sync("fallback", "42", "latest");
  match.mockRejectedValueOnce(new DataError("Unavailable", 502));
  const state = await service().generate("fallback", "42", "900");
  expect(state.review?.context.coverage).toBe("summary");
  expect(state.review?.content.improve).toHaveLength(1);
});
it("bounds saved review retention and removes old-account reviews on a successful switch", async () => {
  const bounded = new ReviewService(
    database.db,
    { match },
    { generate },
    { ...config, reviewRetention: 2 },
    () => now,
  );
  for (const id of ["900", "901", "902"]) {
    now += 61000;
    const d = detail();
    d.id = id;
    match.mockResolvedValueOnce(d);
    await bounded.generate("retain", "42", id);
  }
  expect((await bounded.read("retain", "42", "900")).review).toBeNull();
  expect((await bounded.read("retain", "42", "901")).review).not.toBeNull();
  now += 61000;
  const d = detail();
  d.players[0].accountId = "99";
  match.mockResolvedValueOnce(d);
  await bounded.generate("retain", "99", "900");
  expect(
    await database.db
      .select()
      .from(matchReview)
      .where(eq(matchReview.userId, "retain")),
  ).toHaveLength(1);
  expect((await bounded.read("retain", "42", "901")).review).toBeNull();
});
it("stops an expired request after slow preparation before reserving budget or calling the model", async () => {
  let release!: () => void;
  let started = false;
  const wait = new Promise<void>((r) => (release = r));
  const slow = new ReviewService(
    database.db,
    {
      match: async () => {
        started = true;
        await wait;
        return detail();
      },
    },
    { generate },
    config,
    () => now,
  );
  const pending = slow.generate("slow", "42", "900");
  await vi.waitFor(() => expect(started).toBe(true));
  now += 91000;
  release();
  await expect(pending).rejects.toMatchObject({ status: 409 });
  expect(generate).not.toHaveBeenCalled();
  expect(
    await database.db
      .select()
      .from(reviewAttempt)
      .where(eq(reviewAttempt.userId, "slow")),
  ).toHaveLength(0);
});

it("separates review cache by language and stores authored locale", async () => {
  const first = await service().generate("locale", "42", "900");
  expect(first.review?.locale).toBe("en");
  now += 61000;
  const spanish = await service().generate("locale", "42", "900", "es");
  expect(spanish.review?.locale).toBe("es");
  expect(generate).toHaveBeenLastCalledWith(
    expect.anything(),
    config.reviewModel,
    "es",
  );
  expect(generate).toHaveBeenCalledTimes(2);
  now += 61000;
  await service().generate("locale", "42", "900", "es");
  expect(generate).toHaveBeenCalledTimes(2);
  expect((await service(null).read("locale", "42", "900")).review?.locale).toBe(
    "es",
  );
});
