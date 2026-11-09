import type { Locale } from "../i18n/locale";
import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import type { Database } from "../db";
import type { Config } from "../config";
import { playerMatch, playerSync } from "../history/schema";
import { matchReview } from "../review/schema";
import { savedReviewSchema } from "../review/contracts";
import { reserveReview, settleReview } from "../review/budget";
import { estimateCost } from "../review/provider";
import { buildInsights, questionForModel, validateCoaching } from "./context";
import {
  cannedQuestions,
  CoachingError,
  savedCoachingSchema,
  type FollowUpInput,
  type SavedCoaching,
} from "./contracts";
import {
  coachingPromptVersion,
  reserveCoachingCost,
  type CoachingContext,
  type CoachingModel,
} from "./provider";
import { coachingState } from "./schema";
export const privacyNotice =
  "Do not include names, contact details, account IDs, or other private information. Free text selects a bounded evidence question; your original text is never stored or sent to AI.";
const questions = Object.entries(cannedQuestions).map(([id, label]) => ({
  id,
  label,
}));
export class CoachingService {
  constructor(
    private db: Database,
    private model: CoachingModel | null,
    private config: Config,
    private now = Date.now,
  ) {}
  private async insights(userId: string, accountId: string | null) {
    return this.db.transaction(async (tx) => {
      const [owner] = await tx
        .select()
        .from(playerSync)
        .where(eq(playerSync.userId, userId))
        .for("share");
      const verified = Boolean(accountId && owner?.accountId === accountId);
      const rows = verified
        ? await tx
            .select()
            .from(playerMatch)
            .where(eq(playerMatch.userId, userId))
            .orderBy(desc(playerMatch.startedAt), desc(playerMatch.matchId))
            .limit(1000)
        : [];
      return buildInsights(rows, verified, this.now());
    });
  }
  private async cached(userId: string, accountId: string | null) {
    const [row] = await this.db
      .select()
      .from(coachingState)
      .where(eq(coachingState.userId, userId));
    return row?.accountId === accountId ? this.entries(row.results) : [];
  }
  private entries(raw: unknown): SavedCoaching[] {
    return Array.isArray(raw)
      ? raw.slice(0, 20).flatMap((v) => {
          const p = savedCoachingSchema.safeParse(v);
          return p.success ? [p.data] : [];
        })
      : [];
  }
  async read(userId: string, accountId: string | null) {
    const insights = await this.insights(userId, accountId);
    const cached = insights.verified
      ? await this.cached(userId, accountId)
      : [];
    return {
      enabled: Boolean(this.model),
      insights,
      summary: cached.find((e) => e.kind === "summary") ?? null,
    };
  }
  private async ownedReview(
    userId: string,
    accountId: string,
    matchId: string,
  ) {
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
    const p = savedReviewSchema.safeParse(row?.data);
    return p.success && p.data.matchId === matchId ? p.data : null;
  }
  async readFollowUp(userId: string, accountId: string, matchId: string) {
    const review = await this.ownedReview(userId, accountId, matchId);
    const cached = review ? await this.cached(userId, accountId) : [];
    return {
      enabled: Boolean(this.model),
      answer:
        cached.find((e) => e.kind === "follow_up" && e.matchId === matchId) ??
        null,
      questions,
      privacyNotice,
    };
  }
  async summarize(userId: string, accountId: string, locale: Locale = "en") {
    if (!this.model)
      throw new CoachingError(
        "AI coaching is not configured yet. Your saved observations remain available.",
        503,
      );
    const insights = await this.insights(userId, accountId);
    if (!insights.verified)
      throw new CoachingError(
        "Connect Steam and sync its saved history to summarize your own games.",
        403,
      );
    if (!insights.evidence.length)
      throw new CoachingError(
        "There are not enough comparable saved samples for an AI summary yet. Your latest-day reflection remains available.",
        409,
      );
    const summary = await this.generate(
      userId,
      accountId,
      null,
      {
        kind: "summary",
        question: null,
        coverage: "saved same-hero comparable summaries",
        evidence: insights.evidence,
      },
      locale,
    );
    return { enabled: true, insights, summary };
  }
  async followUp(
    userId: string,
    accountId: string,
    matchId: string,
    input: FollowUpInput,
    locale: Locale = "en",
  ) {
    if (!this.model)
      throw new CoachingError(
        "AI coaching is not configured yet. Saved reviews remain available.",
        503,
      );
    const review = await this.ownedReview(userId, accountId, matchId);
    if (!review)
      throw new CoachingError(
        "Save a review of your own match before asking a follow-up.",
        409,
      );
    const context: CoachingContext = {
      kind: "follow_up",
      question: questionForModel(input),
      coverage: review.context.coverage,
      evidence: review.context.facts.map((f) => ({
        id: f.id,
        metric: f.metric,
        value: f.value,
        samples: f.samples,
        matchIds: [matchId],
      })),
    };
    const answer = await this.generate(
      userId,
      accountId,
      matchId,
      context,
      locale,
    );
    return { enabled: true, answer, questions, privacyNotice };
  }
  private async renew(userId: string, token: string) {
    const now = this.now();
    const [active] = await this.db
      .update(coachingState)
      .set({ leaseUntil: new Date(now + 60000) })
      .where(
        and(
          eq(coachingState.userId, userId),
          eq(coachingState.leaseToken, token),
          gt(coachingState.leaseUntil, new Date(now)),
        ),
      )
      .returning();
    if (
      !active?.leaseUntil ||
      active.leaseUntil.getTime() <= this.now() + 35000
    )
      throw new CoachingError(
        "This coaching request expired. Reload to see your latest saved answer.",
        409,
      );
  }
  private async generate(
    userId: string,
    accountId: string,
    matchId: string | null,
    context: CoachingContext,
    locale: Locale = "en",
  ) {
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          userId,
          accountId,
          matchId,
          context,
          model: this.config.reviewModel,
          promptVersion: coachingPromptVersion,
          locale,
        }),
      )
      .digest("hex");
    const cached = (await this.cached(userId, accountId)).find(
      (e) => e.fingerprint === fingerprint,
    );
    if (cached) return cached;
    const now = this.now(),
      token = randomUUID();
    const [claim] = await this.db
      .insert(coachingState)
      .values({
        userId,
        accountId,
        leaseToken: token,
        leaseUntil: new Date(now + 60000),
        nextAllowedAt: new Date(now + 10000),
        results: [],
      })
      .onConflictDoUpdate({
        target: coachingState.userId,
        set: {
          leaseToken: token,
          leaseUntil: new Date(now + 60000),
          nextAllowedAt: new Date(now + 10000),
        },
        setWhere: and(
          lte(coachingState.nextAllowedAt, new Date(now)),
          or(
            isNull(coachingState.leaseUntil),
            lte(coachingState.leaseUntil, new Date(now)),
          ),
        ),
      })
      .returning();
    if (!claim) {
      const [control] = await this.db
        .select()
        .from(coachingState)
        .where(eq(coachingState.userId, userId));
      const wait =
        Math.max(
          control?.nextAllowedAt.getTime() ?? 0,
          control?.leaseUntil?.getTime() ?? 0,
        ) - now;
      throw new CoachingError(
        "Coaching is already running or was just requested. Wait a moment and try again.",
        429,
        Math.max(1, Math.ceil(wait / 1000)),
      );
    }
    let reserved = false;
    try {
      await this.renew(userId, token);
      // A result may have completed after the initial read but before the lease was granted.
      const leased =
        claim.accountId === accountId
          ? this.entries(claim.results).find(
              (e) => e.fingerprint === fingerprint,
            )
          : undefined;
      if (leased) return leased;
      await reserveReview(
        this.db,
        userId,
        token,
        reserveCoachingCost(context, this.config.reviewModel, locale),
        {
          dailyCents: this.config.reviewDailyBudgetCents,
          monthlyCents: this.config.reviewMonthlyBudgetCents,
          userDaily: 10,
          scope: "coach",
        },
        this.now(),
      );
      reserved = true;
      try {
        await this.renew(userId, token);
      } catch (error) {
        await settleReview(this.db, token, 0);
        throw error;
      }
      const generated = await this.model!.generate(
        context,
        this.config.reviewModel,
        locale,
      );
      const content = validateCoaching(generated.content, context.evidence);
      await settleReview(
        this.db,
        token,
        generated.usage
          ? estimateCost(this.config.reviewModel, generated.usage)
          : undefined,
      );
      const result: SavedCoaching = {
        fingerprint,
        kind: context.kind,
        matchId,
        generatedAt: new Date(this.now()).toISOString(),
        model: this.config.reviewModel,
        promptVersion: coachingPromptVersion,
        locale,
        question: context.question,
        content,
        evidence: context.evidence,
      };
      await this.db.transaction(async (tx) => {
        const [control] = await tx
          .select()
          .from(coachingState)
          .where(eq(coachingState.userId, userId))
          .for("update");
        if (
          control?.leaseToken !== token ||
          !control.leaseUntil ||
          control.leaseUntil.getTime() <= this.now()
        )
          throw new CoachingError(
            "This coaching request expired. Reload to see your latest saved answer.",
            409,
          );
        const previous =
          control.accountId === accountId ? this.entries(control.results) : [];
        await tx
          .update(coachingState)
          .set({
            accountId,
            results: [
              result,
              ...previous.filter((e) => e.fingerprint !== fingerprint),
            ].slice(0, 20),
          })
          .where(eq(coachingState.userId, userId));
      });
      return result;
    } finally {
      try {
        if (reserved) await settleReview(this.db, token, undefined);
      } finally {
        await this.db
          .update(coachingState)
          .set({ leaseToken: null, leaseUntil: null })
          .where(
            and(
              eq(coachingState.userId, userId),
              eq(coachingState.leaseToken, token),
            ),
          );
      }
    }
  }
}
