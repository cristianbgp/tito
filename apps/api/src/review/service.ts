import type { Locale } from "../i18n/locale";
import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, lte, ne, or } from "drizzle-orm";
import type { Config } from "../config";
import type { Database } from "../db";
import { DataError, type OpenDota } from "../dota/opendota";
import { playerMatch, playerSync } from "../history/schema";
import { buildReviewContext, validateReview } from "./context";
import { ReviewError, savedReviewSchema, type SavedReview } from "./contracts";
import { reserveReview, settleReview } from "./budget";
import {
  estimateCost,
  promptVersion,
  reserveCost,
  type ReviewModel,
} from "./provider";
import { matchReview, reviewControl } from "./schema";
import { readReplay } from "../replays/storage";

export class ReviewService {
  constructor(
    private db: Database,
    private source: Pick<OpenDota, "match">,
    private model: ReviewModel | null,
    private config: Config,
    private now = Date.now,
  ) {}
  async read(userId: string, accountId: string, matchId: string) {
    const [row] = await this.db
      .select()
      .from(matchReview)
      .where(
        and(
          eq(matchReview.userId, userId),
          eq(matchReview.accountId, accountId),
          eq(matchReview.matchId, BigInt(matchId)),
        ),
      );
    const saved = savedReviewSchema.safeParse(row?.data);
    return {
      enabled: Boolean(this.model),
      review: saved.success ? saved.data : null,
    };
  }
  private async history(userId: string, accountId: string) {
    return this.db.transaction(async (tx) => {
      const [owner] = await tx
        .select()
        .from(playerSync)
        .where(eq(playerSync.userId, userId))
        .for("share");
      if (owner?.accountId !== accountId) return [];
      const rows = await tx
        .select()
        .from(playerMatch)
        .where(eq(playerMatch.userId, userId))
        .orderBy(desc(playerMatch.matchId))
        .limit(1000);
      return rows.map(({ matchId, userId: _, ...row }) => ({
        ...row,
        id: String(matchId),
        accountId,
      }));
    });
  }
  private async renew(userId: string, token: string) {
    const now = this.now();
    const [active] = await this.db
      .update(reviewControl)
      .set({ leaseUntil: new Date(now + 90000) })
      .where(
        and(
          eq(reviewControl.userId, userId),
          eq(reviewControl.leaseToken, token),
          gt(reviewControl.leaseUntil, new Date(now)),
        ),
      )
      .returning();
    // The UPDATE itself may have waited in the pool/on a lock. Keep enough lease
    // for the bounded 30-second model request instead of starting on a stale grant.
    if (
      !active?.leaseUntil ||
      active.leaseUntil.getTime() <= this.now() + 35000
    )
      throw new ReviewError(
        "The review request expired. Reload to see the latest saved result.",
        409,
      );
  }
  async generate(
    userId: string,
    accountId: string,
    matchId: string,
    locale: Locale = "en",
  ) {
    if (!this.model)
      throw new ReviewError(
        "AI reviews are not configured yet. Add OPENAI_API_KEY to the API environment to enable them.",
        503,
      );
    const now = this.now(),
      token = randomUUID();
    const [claim] = await this.db
      .insert(reviewControl)
      .values({
        userId,
        leaseToken: token,
        leaseUntil: new Date(now + 90000),
        nextAllowedAt: new Date(now + 60000),
      })
      .onConflictDoUpdate({
        target: reviewControl.userId,
        set: {
          leaseToken: token,
          leaseUntil: new Date(now + 90000),
          nextAllowedAt: new Date(now + 60000),
        },
        setWhere: and(
          lte(reviewControl.nextAllowedAt, new Date(now)),
          or(
            isNull(reviewControl.leaseUntil),
            lte(reviewControl.leaseUntil, new Date(now)),
          ),
        ),
      })
      .returning();
    if (!claim) {
      const [control] = await this.db
        .select()
        .from(reviewControl)
        .where(eq(reviewControl.userId, userId));
      const wait =
        Math.max(
          control?.nextAllowedAt.getTime() ?? 0,
          control?.leaseUntil?.getTime() ?? 0,
        ) - now;
      throw new ReviewError(
        "A review is already running, or you requested one recently. Wait a moment and try again.",
        429,
        Math.max(1, Math.ceil(wait / 1000)),
      );
    }
    let reserved = false;
    try {
      const history = await this.history(userId, accountId);
      const saved = history.find((m) => m.id === matchId);
      let detail = null;
      try {
        detail =
          (await readReplay(this.db, userId, matchId)) ??
          (await this.source.match(matchId));
      } catch (error) {
        if (!(error instanceof DataError) || !saved) throw error;
      }
      const context = buildReviewContext(
        accountId,
        detail,
        saved,
        history,
        matchId,
      );
      await this.renew(userId, token);
      const fingerprint = createHash("sha256")
        .update(
          JSON.stringify({
            userId,
            accountId,
            matchId,
            model: this.config.reviewModel,
            promptVersion,
            locale,
            context,
          }),
        )
        .digest("hex");
      const [existing] = await this.db
        .select()
        .from(matchReview)
        .where(
          and(
            eq(matchReview.userId, userId),
            eq(matchReview.accountId, accountId),
            eq(matchReview.matchId, BigInt(matchId)),
          ),
        );
      if (
        existing?.fingerprint === fingerprint &&
        savedReviewSchema.safeParse(existing.data).success
      )
        return { enabled: true, review: existing.data };
      await reserveReview(
        this.db,
        userId,
        token,
        reserveCost(context, this.config.reviewModel, locale),
        {
          dailyCents: this.config.reviewDailyBudgetCents,
          monthlyCents: this.config.reviewMonthlyBudgetCents,
          userDaily: this.config.reviewUserDailyLimit,
        },
        this.now(),
      );
      reserved = true;
      // A budget transaction can wait behind another instance. Recheck fencing immediately
      // before paid work; refund only when we know no model request was started.
      try {
        await this.renew(userId, token);
      } catch (error) {
        await settleReview(this.db, token, 0);
        throw error;
      }
      const generated = await this.model.generate(
        context,
        this.config.reviewModel,
        locale,
      );
      const content = validateReview(generated.content, context);
      await settleReview(
        this.db,
        token,
        generated.usage
          ? estimateCost(this.config.reviewModel, generated.usage)
          : undefined,
      );
      const generatedAt = new Date(this.now());
      const review: SavedReview = {
        matchId,
        generatedAt: generatedAt.toISOString(),
        model: this.config.reviewModel,
        promptVersion,
        locale,
        context,
        content,
      };
      await this.db.transaction(async (tx) => {
        const [control] = await tx
          .select()
          .from(reviewControl)
          .where(eq(reviewControl.userId, userId))
          .for("update");
        if (
          control?.leaseToken !== token ||
          !control.leaseUntil ||
          control.leaseUntil.getTime() <= this.now()
        )
          throw new ReviewError(
            "The review request expired. Reload to see the latest saved result.",
            409,
          );
        await tx
          .delete(matchReview)
          .where(
            and(
              eq(matchReview.userId, userId),
              ne(matchReview.accountId, accountId),
            ),
          );
        await tx
          .insert(matchReview)
          .values({
            userId,
            accountId,
            matchId: BigInt(matchId),
            fingerprint,
            data: review,
            generatedAt,
          })
          .onConflictDoUpdate({
            target: [matchReview.userId, matchReview.matchId],
            set: { accountId, fingerprint, data: review, generatedAt },
          });
        const excess = await tx
          .select({ id: matchReview.matchId })
          .from(matchReview)
          .where(eq(matchReview.userId, userId))
          .orderBy(desc(matchReview.generatedAt), desc(matchReview.matchId))
          .offset(this.config.reviewRetention);
        if (excess.length)
          await tx.delete(matchReview).where(
            and(
              eq(matchReview.userId, userId),
              inArray(
                matchReview.matchId,
                excess.map((r) => r.id),
              ),
            ),
          );
      });
      return { enabled: true, review };
    } finally {
      // Even invalid outputs/timeouts consume their reservation; failures never erase a saved review.
      try {
        if (reserved) await settleReview(this.db, token, undefined);
      } finally {
        await this.db
          .update(reviewControl)
          .set({ leaseToken: null, leaseUntil: null })
          .where(
            and(
              eq(reviewControl.userId, userId),
              eq(reviewControl.leaseToken, token),
            ),
          );
      }
    }
  }
}
