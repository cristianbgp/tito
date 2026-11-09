import { heroPool } from "../library/schema";
import { createHash, randomUUID } from "node:crypto";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import type { Database } from "../db";
import type { Config } from "../config";
import { playerMatch, playerSync } from "../history/schema";
import { reserveReview, settleReview } from "../review/budget";
import { heroDraft } from "./schema";
import { heroCatalog, catalogRetrievedAt } from "./catalog";
import {
  DraftError,
  draftResultSchema,
  type DraftInput,
  type DraftResult,
} from "./contracts";
import {
  buildDraftContext,
  canonicalDraft,
  type DraftPreferences,
} from "./context";
import { loadDraftEvidence, type DraftEvidenceSource } from "./evidence";
import {
  draftPromptVersion,
  estimateDraftCost,
  reserveDraftCost,
  validateRatings,
  type DraftModel,
} from "./provider";
export class DraftService {
  constructor(
    private db: Database,
    private model: DraftModel | null,
    private config: Config,
    private now = Date.now,
    private evidenceSource?: DraftEvidenceSource,
  ) {}
  private async preferences(
    userId: string,
    role: DraftInput["role"],
  ): Promise<DraftPreferences> {
    const [saved] = await this.db
      .select({ entries: heroPool.entries })
      .from(heroPool)
      .where(and(eq(heroPool.userId, userId), eq(heroPool.role, role)));
    return {
      favorites: (saved?.entries ?? [])
        .filter((entry) => entry.preference === "favorite")
        .map((entry) => entry.heroId),
      avoided: (saved?.entries ?? [])
        .filter((entry) => entry.preference === "avoid")
        .map((entry) => entry.heroId),
    };
  }
  private async experience(
    userId: string,
    accountId: string | null,
    enabled: boolean,
  ) {
    if (!accountId || !enabled) return [];
    return this.db.transaction(async (tx) => {
      const [owner] = await tx
        .select()
        .from(playerSync)
        .where(eq(playerSync.userId, userId))
        .for("share");
      if (owner?.accountId !== accountId) return [];
      return tx
        .select({ heroId: playerMatch.heroId })
        .from(playerMatch)
        .where(eq(playerMatch.userId, userId))
        .limit(1000);
    });
  }
  private async renew(userId: string, token: string) {
    const now = this.now();
    const [active] = await this.db
      .update(heroDraft)
      .set({ leaseUntil: new Date(now + 20000) })
      .where(
        and(
          eq(heroDraft.userId, userId),
          eq(heroDraft.leaseToken, token),
          gt(heroDraft.leaseUntil, new Date(now)),
        ),
      )
      .returning();
    if (
      !active?.leaseUntil ||
      active.leaseUntil.getTime() <= this.now() + 10000
    )
      throw new DraftError(
        "This draft request expired. Try suggesting heroes again.",
        409,
      );
  }
  async suggest(
    userId: string,
    accountId: string | null,
    input: DraftInput,
  ): Promise<DraftResult> {
    if (!this.model)
      throw new DraftError(
        "AI hero suggestions are not configured yet. Your draft can still be prepared.",
        503,
      );
    input = canonicalDraft(input);
    const [history, preferences] = await Promise.all([
      this.experience(userId, accountId, input.useHistory),
      this.preferences(userId, input.role),
    ]);
    const context = buildDraftContext(input, heroCatalog, history, preferences);
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          userId,
          accountId,
          input,
          context,
          catalogRetrievedAt,
          model: "gpt-6-luna",
          promptVersion: draftPromptVersion,
        }),
      )
      .digest("hex");
    const [existing] = await this.db
      .select()
      .from(heroDraft)
      .where(eq(heroDraft.userId, userId));
    const saved = draftResultSchema.safeParse(existing?.data);
    if (
      existing?.fingerprint === fingerprint &&
      saved.success &&
      Date.parse(saved.data.expiresAt) > this.now()
    )
      return saved.data;
    const now = this.now(),
      token = randomUUID();
    const [claimed] = await this.db
      .insert(heroDraft)
      .values({
        userId,
        leaseToken: token,
        leaseUntil: new Date(now + 20000),
        nextAllowedAt: new Date(now + 2000),
      })
      .onConflictDoUpdate({
        target: heroDraft.userId,
        set: {
          leaseToken: token,
          leaseUntil: new Date(now + 20000),
          nextAllowedAt: new Date(now + 2000),
        },
        setWhere: and(
          lte(heroDraft.nextAllowedAt, new Date(now)),
          or(
            isNull(heroDraft.leaseUntil),
            lte(heroDraft.leaseUntil, new Date(now)),
          ),
        ),
      })
      .returning();
    if (!claimed)
      throw new DraftError(
        "Hero suggestions are already running or were just requested. Wait a moment and try again.",
        429,
        2,
      );
    let reserved = false;
    try {
      await this.renew(userId, token);
      // Another request may have completed after our initial cache read but before
      // this lease was granted. The returned row is the current locked version.
      const leasedCache = draftResultSchema.safeParse(claimed.data);
      if (
        claimed.fingerprint === fingerprint &&
        leasedCache.success &&
        Date.parse(leasedCache.data.expiresAt) > this.now()
      )
        return leasedCache.data;
      await reserveReview(
        this.db,
        userId,
        token,
        reserveDraftCost(context, input.useEvidence ? 8192 : 0),
        {
          dailyCents: this.config.reviewDailyBudgetCents,
          monthlyCents: this.config.reviewMonthlyBudgetCents,
          userDaily: this.config.draftUserDailyLimit,
          scope: "draft",
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
      if (input.useEvidence && this.evidenceSource)
        context.evidence = await loadDraftEvidence(
          this.evidenceSource,
          input.enemies,
          context.candidates.map((h) => h.id),
        );
      // Recheck the lease after provider lookups; no expired request may call AI.
      try {
        await this.renew(userId, token);
      } catch (error) {
        await settleReview(this.db, token, 0);
        throw error;
      }
      const response = await this.model.evaluate(context);
      let ratings;
      try {
        ratings = validateRatings(response.ratings, context);
      } catch {
        throw new DraftError(
          "The hero suggestions could not be validated. Try again later.",
          502,
        );
      }
      await settleReview(
        this.db,
        token,
        response.inputTokens === undefined
          ? undefined
          : estimateDraftCost(response.inputTokens),
      );
      const candidates = new Map(
        context.candidates.map((hero) => [hero.id, hero]),
      );
      const ranked = ratings.sort(
        (a, b) =>
          b.fit - a.fit ||
          b.confidence - a.confidence ||
          Number(candidates.get(b.id)!.favorite) -
            Number(candidates.get(a.id)!.favorite) ||
          a.id - b.id,
      );
      const overall = ranked.slice(0, 3);
      const overallIds = new Set(overall.map((rating) => rating.id));
      const favoriteAlternatives = ranked
        .filter(
          (rating) =>
            candidates.get(rating.id)!.favorite && !overallIds.has(rating.id),
        )
        .slice(0, 2);
      const recommendation = (rating: (typeof ranked)[number]) => ({
        hero: heroCatalog.find((hero) => hero.id === rating.id)!,
        fit: rating.fit,
        confidence: rating.confidence,
        reason: rating.reason,
        tradeoff: rating.tradeoff,
        savedGames: candidates.get(rating.id)!.savedGames,
        favorite: candidates.get(rating.id)!.favorite,
      });
      const generated = this.now();
      const result: DraftResult = {
        fingerprint,
        generatedAt: new Date(generated).toISOString(),
        expiresAt: new Date(generated + 15 * 60000).toISOString(),
        model: "gpt-6-luna",
        promptVersion: draftPromptVersion,
        input,
        personalized: context.historyGames > 0,
        historyGames: context.historyGames,
        evaluatedHeroes: context.candidates.length,
        ...(context.evidence
          ? {
              evidence: {
                requestedEnemies: context.evidence.requestedEnemies,
                loadedEnemies: context.evidence.loadedEnemies,
                matchups: context.evidence.matchups.length,
                sources: context.evidence.sources,
              },
            }
          : {}),
        recommendations: overall.map(recommendation),
        favoriteRecommendations: favoriteAlternatives.map(recommendation),
      };
      await this.db.transaction(async (tx) => {
        const [control] = await tx
          .select()
          .from(heroDraft)
          .where(eq(heroDraft.userId, userId))
          .for("update");
        if (
          control?.leaseToken !== token ||
          !control.leaseUntil ||
          control.leaseUntil.getTime() <= this.now()
        )
          throw new DraftError(
            "This draft request expired. Try suggesting heroes again.",
            409,
          );
        await tx
          .update(heroDraft)
          .set({ fingerprint, data: result })
          .where(eq(heroDraft.userId, userId));
      });
      return result;
    } finally {
      try {
        if (reserved) await settleReview(this.db, token, undefined);
      } finally {
        await this.db
          .update(heroDraft)
          .set({ leaseToken: null, leaseUntil: null })
          .where(
            and(eq(heroDraft.userId, userId), eq(heroDraft.leaseToken, token)),
          );
      }
    }
  }
}
