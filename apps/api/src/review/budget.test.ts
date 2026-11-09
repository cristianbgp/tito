import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { reserveReview, settleReview } from "./budget";
import { reviewBudget } from "./schema";
let dir: string;
let database: Awaited<ReturnType<typeof createTestDatabase>>;
const now = Date.UTC(2026, 10, 7);
const limits = { dailyCents: 1, monthlyCents: 2, userDaily: 2 };
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tito-review-budget-"));
  database = await createTestDatabase(dir);
  await database.db
    .insert(user)
    .values({ id: "u", name: "Budget", email: "budget@review.invalid" });
});
afterAll(async () => {
  await database?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});
it("reserves atomically across instances and settles exactly once without refunding attempts", async () => {
  const results = await Promise.allSettled([
    reserveReview(database.db, "u", "a", 7000, limits, now),
    reserveReview(database.db, "u", "b", 7000, limits, now),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const token = results[0].status === "fulfilled" ? "a" : "b";
  await settleReview(database.db, token, 1000);
  await settleReview(database.db, token, 0);
  const [daily] = await database.db
    .select()
    .from(reviewBudget)
    .where(eq(reviewBudget.key, "global:day"));
  expect(daily.usedMicros).toBe(1000);
  await reserveReview(database.db, "u", "c", 7000, limits, now);
  await expect(
    reserveReview(database.db, "u", "d", 1, limits, now),
  ).rejects.toMatchObject({ status: 429 });
  await settleReview(database.db, "c", undefined);
  const [after] = await database.db
    .select()
    .from(reviewBudget)
    .where(eq(reviewBudget.key, "global:day"));
  expect(after.usedMicros).toBe(8000);
});
it("never refunds a new period when an old attempt settles late and keeps the monthly ceiling", async () => {
  const next = now + 86400000;
  await reserveReview(database.db, "u", "e", 7000, limits, next);
  await settleReview(database.db, "e", 1000);
  // Midnight reset daily, not monthly. Previous day consumed 8,000µ; new day 1,000µ.
  await reserveReview(database.db, "u", "f", 7000, limits, next);
  await expect(
    reserveReview(
      database.db,
      "u",
      "g",
      7000,
      { ...limits, dailyCents: 100, userDaily: 20 },
      next,
    ),
  ).rejects.toMatchObject({ status: 429 });
  const month = Date.UTC(2026, 11, 1);
  await reserveReview(database.db, "u", "new-month", 7000, limits, month);
  await settleReview(database.db, "f", 0);
  const [daily] = await database.db
    .select()
    .from(reviewBudget)
    .where(eq(reviewBudget.key, "global:day"));
  const [monthly] = await database.db
    .select()
    .from(reviewBudget)
    .where(eq(reviewBudget.key, "global:month"));
  expect(daily.usedMicros).toBe(7000);
  expect(monthly.usedMicros).toBe(7000);
});
it("rejects delayed old-period reservations instead of resetting newer counters", async () => {
  const future = Date.UTC(2030, 11, 1);
  await reserveReview(
    database.db,
    "u",
    "future",
    7000,
    { ...limits, monthlyCents: 1 },
    future,
  );
  await expect(
    reserveReview(
      database.db,
      "u",
      "late",
      7000,
      { ...limits, monthlyCents: 1 },
      future - 1000,
    ),
  ).rejects.toMatchObject({ status: 429 });
  await expect(
    reserveReview(
      database.db,
      "u",
      "future-again",
      7000,
      { ...limits, monthlyCents: 1 },
      future,
    ),
  ).rejects.toMatchObject({ status: 429 });
});
it("shares global spend across features while separating per-user attempts and refunds", async () => {
  const day = Date.UTC(2031, 0, 1);
  await reserveReview(
    database.db,
    "u",
    "review-scope",
    6000,
    { dailyCents: 1, monthlyCents: 2, userDaily: 1 },
    day,
  );
  await reserveReview(
    database.db,
    "u",
    "draft-scope",
    3000,
    { dailyCents: 1, monthlyCents: 2, userDaily: 2, scope: "draft" },
    day,
  );
  await expect(
    reserveReview(
      database.db,
      "u",
      "draft-over-budget",
      3000,
      { dailyCents: 1, monthlyCents: 2, userDaily: 2, scope: "draft" },
      day,
    ),
  ).rejects.toMatchObject({ status: 429 });
  await settleReview(database.db, "draft-scope", 1000);
  const [counter] = await database.db
    .select()
    .from(reviewBudget)
    .where(eq(reviewBudget.key, "user:draft:u"));
  expect(counter.usedMicros).toBe(1000);
  expect(counter.attempts).toBe(1);
  await expect(
    reserveReview(
      database.db,
      "u",
      "review-over-attempts",
      1,
      { dailyCents: 1, monthlyCents: 2, userDaily: 1 },
      day,
    ),
  ).rejects.toMatchObject({ status: 429 });
});
