import { and, eq, lt, or, sql } from "drizzle-orm";
import type { Database } from "../db";
import { ReviewError } from "./contracts";
import { reviewAttempt, reviewBudget } from "./schema";

export async function reserveReview(
  db: Database,
  userId: string,
  token: string,
  cost: number,
  limits: {
    dailyCents: number;
    monthlyCents: number;
    userDaily: number;
    scope?: "draft" | "coach";
  },
  now: number,
) {
  const day = new Date(now).toISOString().slice(0, 10),
    month = day.slice(0, 7);
  const userBudgetKey = limits.scope
    ? `user:${limits.scope}:${userId}`
    : `user:${userId}`;
  if (!Number.isSafeInteger(cost) || cost < 1)
    throw new Error("Invalid review reservation");
  await db.transaction(async (tx) => {
    await tx
      .delete(reviewAttempt)
      .where(lt(reviewAttempt.createdAt, new Date(now - 35 * 86400000)));
    // Fixed lock order across all requests and instances. Failed reservations roll back together.
    for (const scope of [
      {
        key: "global:month",
        period: month,
        cap: limits.monthlyCents * 10000,
        attempts: 2147483647,
        ownerId: null,
      },
      {
        key: "global:day",
        period: day,
        cap: limits.dailyCents * 10000,
        attempts: 2147483647,
        ownerId: null,
      },
      {
        key: userBudgetKey,
        period: day,
        cap: Number.MAX_SAFE_INTEGER,
        attempts: limits.userDaily,
        ownerId: userId,
      },
    ]) {
      const limited = () =>
        new ReviewError(
          limits.scope === "coach"
            ? "The AI budget or daily coaching limit is reached. Saved coaching remains available. Try again after the current UTC day or month ends."
            : limits.scope
              ? "The AI budget or daily hero-picker limit is reached. Your draft is still available. Try again after the current UTC day or month ends."
              : "The AI review budget or daily review limit is reached. Saved reviews remain available. Try again after the current UTC day or month ends.",
          429,
          Math.max(
            1,
            Math.ceil((Date.parse(`${day}T00:00:00Z`) + 86400000 - now) / 1000),
          ),
        );
      if (cost > scope.cap) throw limited();
      const [row] = await tx
        .insert(reviewBudget)
        .values({
          key: scope.key,
          ownerId: scope.ownerId,
          period: scope.period,
          usedMicros: cost,
          attempts: 1,
        })
        .onConflictDoUpdate({
          target: reviewBudget.key,
          set: {
            period: scope.period,
            usedMicros: sql`case when ${reviewBudget.period}=${scope.period} then ${reviewBudget.usedMicros}+${cost} else ${cost} end`,
            attempts: sql`case when ${reviewBudget.period}=${scope.period} then ${reviewBudget.attempts}+1 else 1 end`,
          },
          setWhere: or(
            lt(reviewBudget.period, scope.period),
            and(
              eq(reviewBudget.period, scope.period),
              sql`${reviewBudget.usedMicros}+${cost}<=${scope.cap}`,
              lt(reviewBudget.attempts, scope.attempts),
            ),
          ),
        })
        .returning();
      if (!row) throw limited();
    }
    await tx.insert(reviewAttempt).values({
      token,
      userId,
      reservedMicros: cost,
      userBudgetKey,
      day,
      month,
      createdAt: new Date(now),
    });
  });
}

/** A missing/ambiguous usage report retains the entire reservation. Reconciliation is idempotent. */
export async function settleReview(
  db: Database,
  token: string,
  actualMicros: number | undefined,
) {
  await db.transaction(async (tx) => {
    const [attempt] = await tx
      .update(reviewAttempt)
      .set({ settled: 1 })
      .where(and(eq(reviewAttempt.token, token), eq(reviewAttempt.settled, 0)))
      .returning();
    if (!attempt) return;
    const actual =
      typeof actualMicros === "number" &&
      Number.isSafeInteger(actualMicros) &&
      actualMicros >= 0
        ? actualMicros
        : attempt.reservedMicros;
    const difference = actual - attempt.reservedMicros;
    if (!difference) return;
    for (const [key, period] of [
      ["global:month", attempt.month],
      ["global:day", attempt.day],
      [attempt.userBudgetKey ?? `user:${attempt.userId}`, attempt.day],
    ])
      await tx
        .update(reviewBudget)
        .set({
          usedMicros: sql`greatest(0,${reviewBudget.usedMicros}+${difference})`,
        })
        .where(and(eq(reviewBudget.key, key), eq(reviewBudget.period, period)));
  });
}
