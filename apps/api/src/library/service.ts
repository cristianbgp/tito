import { randomUUID } from "node:crypto";
import {
  and,
  count,
  desc,
  eq,
  isNull,
  isNotNull,
  ne,
  notExists,
  sql,
} from "drizzle-orm";
import type { z } from "zod";
import type { Config } from "../config";
import type { Database } from "../db";
import { user } from "../db/schema";
import { heroCatalog } from "../draft/catalog";
import { parseAccountId } from "../dota/opendota";
import { playerMatch, playerSync } from "../history/schema";
import { matchReview, reviewBudget } from "../review/schema";
import { draftSnapshot, heroPool, matchAnnotation } from "./schema";
import {
  draftSnapshotInputSchema,
  draftUpdateSchema,
  feedbackInputSchema,
  LibraryError,
  matchIdSchema,
  noteInputSchema,
  poolInputSchema,
  reflectionQuerySchema,
  roleSchema,
  type DraftSnapshotInput,
  type MatchNote,
  type ReviewFeedback,
} from "./contracts";
import { selectSession, summarizeHero, summarizeSession } from "./summary";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Snapshot = typeof draftSnapshot.$inferSelect;
const roles = ["1", "2", "3", "4", "5"] as const;
const validate = <S extends z.ZodType>(
  schema: S,
  value: unknown,
): z.output<S> => {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new LibraryError(
      parsed.error.issues[0]?.message ?? "Invalid library input.",
      400,
    );
  return parsed.data;
};
const snapshotValue = (row: Snapshot) => ({
  id: row.id,
  input: row.input,
  chosenHeroId: row.chosenHeroId,
  matchId: row.matchId === null ? null : String(row.matchId),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
const noteValue = (row: typeof matchAnnotation.$inferSelect) =>
  row.note
    ? {
        ...row.note,
        matchId: String(row.matchId),
        updatedAt: row.updatedAt.toISOString(),
      }
    : null;
const accountCondition = (accountId: string | null) =>
  accountId === null
    ? isNull(draftSnapshot.accountId)
    : eq(draftSnapshot.accountId, accountId);

export class LibraryService {
  constructor(
    private db: Database,
    private config: Config,
    private now = Date.now,
  ) {}

  private async lockUser(
    tx: Transaction,
    userId: string,
    accountId?: string | null,
  ) {
    const [owner] = await tx
      .select({ id: user.id, steamId: user.steamId })
      .from(user)
      .where(eq(user.id, userId))
      .for("update");
    if (!owner) throw new LibraryError("Your account is unavailable.", 403);
    // A session resolved before a Steam change must never write across that change.
    if (accountId !== undefined) {
      const actual = owner.steamId ? parseAccountId(owner.steamId) : null;
      if (actual !== accountId)
        throw new LibraryError(
          "Your Steam connection changed. Reload Tito.",
          403,
        );
    }
  }
  private async currentAccount(
    tx: Transaction,
    userId: string,
    accountId: string | null,
  ) {
    const [owner] = await tx
      .select({ steamId: user.steamId })
      .from(user)
      .where(eq(user.id, userId))
      .for("share");
    return Boolean(
      owner &&
      (owner.steamId ? parseAccountId(owner.steamId) : null) === accountId,
    );
  }
  private async lockHistory(
    tx: Transaction,
    userId: string,
    accountId: string | null,
  ) {
    if (!(await this.currentAccount(tx, userId, accountId))) return false;
    const [state] = await tx
      .select()
      .from(playerSync)
      .where(eq(playerSync.userId, userId))
      .for("share");
    return Boolean(accountId && state?.accountId === accountId);
  }
  private async ownMatch(
    tx: Transaction,
    userId: string,
    accountId: string | null,
    matchId: string,
  ) {
    const id = BigInt(validate(matchIdSchema, matchId));
    if (!(await this.lockHistory(tx, userId, accountId)))
      throw new LibraryError(
        "This match is not in your linked account's saved history.",
        404,
      );
    const [game] = await tx
      .select()
      .from(playerMatch)
      .where(and(eq(playerMatch.userId, userId), eq(playerMatch.matchId, id)));
    if (!game)
      throw new LibraryError(
        "This match is not in your linked account's saved history.",
        404,
      );
    return game;
  }
  private async makeAnnotationSpace(
    tx: Transaction,
    userId: string,
    accountId: string,
    matchId: bigint,
  ) {
    // Only obsolete feedback-only rows are disposable. Written notes outlive
    // retained summaries and account switches until their owner deletes them.
    await tx.delete(matchAnnotation).where(
      and(
        eq(matchAnnotation.userId, userId),
        isNull(matchAnnotation.note),
        notExists(
          tx
            .select({ matchId: matchReview.matchId })
            .from(matchReview)
            .where(
              and(
                eq(matchReview.userId, matchAnnotation.userId),
                eq(matchReview.matchId, matchAnnotation.matchId),
                eq(matchReview.accountId, matchAnnotation.accountId),
                sql`${matchReview.generatedAt} = ${matchAnnotation.reviewGeneratedAt}::timestamptz`,
              ),
            ),
        ),
      ),
    );
    const [existing] = await tx
      .select()
      .from(matchAnnotation)
      .where(
        and(
          eq(matchAnnotation.userId, userId),
          eq(matchAnnotation.matchId, matchId),
        ),
      );
    if (existing && existing.accountId !== accountId)
      throw new LibraryError(
        "A saved annotation for this match belongs to a previous Steam account. Relink that account to manage its notes or feedback.",
        409,
      );
    if (!existing) {
      const [size] = await tx
        .select({ total: count() })
        .from(matchAnnotation)
        .where(eq(matchAnnotation.userId, userId));
      if (size.total >= 200) {
        const [archived] = await tx
          .select({ total: count() })
          .from(matchAnnotation)
          .where(
            and(
              eq(matchAnnotation.userId, userId),
              ne(matchAnnotation.accountId, accountId),
            ),
          );
        throw new LibraryError(
          archived.total > 0
            ? "Your 200 saved match annotations are full. Relink your previous Steam account to manage its notes or feedback, or delete a current note or clear review feedback."
            : "Your 200 saved match annotations are full. Delete a note or clear review feedback before saving another.",
          409,
        );
      }
    }
  }

  async pools(userId: string) {
    const rows = await this.db
      .select()
      .from(heroPool)
      .where(eq(heroPool.userId, userId));
    return roles.map((role) => {
      const row = rows.find((r) => r.role === role);
      return {
        role,
        entries: row?.entries ?? [],
        updatedAt: row?.updatedAt.toISOString() ?? null,
      };
    });
  }
  async pool(userId: string, role: string) {
    const valid = validate(roleSchema, role);
    return (await this.pools(userId)).find((row) => row.role === valid)!;
  }
  async putPool(
    userId: string,
    role: string,
    input: z.input<typeof poolInputSchema>,
  ) {
    const valid = validate(roleSchema, role),
      data = validate(poolInputSchema, input);
    const [row] = await this.db
      .insert(heroPool)
      .values({
        userId,
        role: valid,
        entries: data.entries,
        updatedAt: new Date(this.now()),
      })
      .onConflictDoUpdate({
        target: [heroPool.userId, heroPool.role],
        set: { entries: data.entries, updatedAt: new Date(this.now()) },
      })
      .returning();
    return {
      role: valid,
      entries: row.entries,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async notes(userId: string, accountId: string | null) {
    return this.db.transaction(async (tx) => {
      if (!accountId || !(await this.currentAccount(tx, userId, accountId)))
        return [];
      const rows = await tx
        .select()
        .from(matchAnnotation)
        .where(
          and(
            eq(matchAnnotation.userId, userId),
            eq(matchAnnotation.accountId, accountId),
            isNotNull(matchAnnotation.note),
          ),
        )
        .orderBy(desc(matchAnnotation.updatedAt))
        .limit(200);
      return rows.map((row) => noteValue(row)!);
    });
  }
  async note(userId: string, accountId: string | null, matchId: string) {
    validate(matchIdSchema, matchId);
    return (
      (await this.notes(userId, accountId)).find(
        (note) => note.matchId === matchId,
      ) ?? null
    );
  }
  async putNote(
    userId: string,
    accountId: string,
    matchId: string,
    input: MatchNote,
  ) {
    const data = validate(noteInputSchema, input);
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId, accountId);
      const game = await this.ownMatch(tx, userId, accountId, matchId);
      if (data.bookmarkSeconds !== null && data.bookmarkSeconds > game.duration)
        throw new LibraryError(
          "The bookmark must be within this match's saved duration.",
          400,
        );
      await this.makeAnnotationSpace(tx, userId, accountId, game.matchId);
      const [row] = await tx
        .insert(matchAnnotation)
        .values({
          userId,
          accountId,
          matchId: game.matchId,
          note: data,
          updatedAt: new Date(this.now()),
        })
        .onConflictDoUpdate({
          target: [matchAnnotation.userId, matchAnnotation.matchId],
          set: { note: data, updatedAt: new Date(this.now()) },
        })
        .returning();
      // The annotation is the explicit confirmation; retained history projects it
      // for comparisons and other owned-history readers in the same commit.
      await tx
        .update(playerMatch)
        .set({ actualRole: data.actualRole })
        .where(
          and(
            eq(playerMatch.userId, userId),
            eq(playerMatch.matchId, game.matchId),
          ),
        );
      return noteValue(row)!;
    });
  }
  async deleteNote(userId: string, accountId: string, matchId: string) {
    const id = BigInt(validate(matchIdSchema, matchId));
    await this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId, accountId);
      const retained = await this.lockHistory(tx, userId, accountId);
      const condition = and(
        eq(matchAnnotation.userId, userId),
        eq(matchAnnotation.accountId, accountId),
        eq(matchAnnotation.matchId, id),
      );
      const [row] = await tx
        .update(matchAnnotation)
        .set({ note: null, updatedAt: new Date(this.now()) })
        .where(condition)
        .returning();
      if (row && !row.feedback)
        await tx.delete(matchAnnotation).where(condition);
      if (row && retained)
        await tx
          .update(playerMatch)
          .set({ actualRole: null })
          .where(
            and(eq(playerMatch.userId, userId), eq(playerMatch.matchId, id)),
          );
    });
    return { deleted: true as const };
  }
  async deleteFeedback(userId: string, accountId: string, matchId: string) {
    const id = BigInt(validate(matchIdSchema, matchId));
    await this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId, accountId);
      const condition = and(
        eq(matchAnnotation.userId, userId),
        eq(matchAnnotation.accountId, accountId),
        eq(matchAnnotation.matchId, id),
      );
      const [row] = await tx
        .update(matchAnnotation)
        .set({
          feedback: null,
          reviewGeneratedAt: null,
          updatedAt: new Date(this.now()),
        })
        .where(condition)
        .returning();
      if (row && !row.note) await tx.delete(matchAnnotation).where(condition);
    });
    return { deleted: true as const };
  }
  async feedback(userId: string, accountId: string | null, matchId: string) {
    const id = BigInt(validate(matchIdSchema, matchId));
    if (!accountId) return null;
    return this.db.transaction(async (tx) => {
      if (!(await this.currentAccount(tx, userId, accountId))) return null;
      const [row] = await tx
        .select({
          annotation: matchAnnotation,
          generatedAt: matchReview.generatedAt,
        })
        .from(matchAnnotation)
        .innerJoin(
          matchReview,
          and(
            eq(matchReview.userId, matchAnnotation.userId),
            eq(matchReview.matchId, matchAnnotation.matchId),
            eq(matchReview.accountId, matchAnnotation.accountId),
          ),
        )
        .where(
          and(
            eq(matchAnnotation.userId, userId),
            eq(matchAnnotation.accountId, accountId),
            eq(matchAnnotation.matchId, id),
          ),
        );
      return row?.annotation.feedback &&
        row.annotation.reviewGeneratedAt === row.generatedAt.toISOString()
        ? {
            ...row.annotation.feedback,
            updatedAt: row.annotation.updatedAt.toISOString(),
          }
        : null;
    });
  }
  async putFeedback(
    userId: string,
    accountId: string,
    matchId: string,
    input: ReviewFeedback,
  ) {
    const data = validate(feedbackInputSchema, input),
      id = BigInt(validate(matchIdSchema, matchId));
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId, accountId);
      const [review] = await tx
        .select()
        .from(matchReview)
        .where(
          and(
            eq(matchReview.userId, userId),
            eq(matchReview.accountId, accountId),
            eq(matchReview.matchId, id),
          ),
        )
        .for("share");
      if (!review)
        throw new LibraryError(
          "Save your own match review before leaving feedback.",
          404,
        );
      await this.makeAnnotationSpace(tx, userId, accountId, id);
      const [row] = await tx
        .insert(matchAnnotation)
        .values({
          userId,
          accountId,
          matchId: id,
          feedback: data,
          reviewGeneratedAt: review.generatedAt.toISOString(),
          updatedAt: new Date(this.now()),
        })
        .onConflictDoUpdate({
          target: [matchAnnotation.userId, matchAnnotation.matchId],
          set: {
            feedback: data,
            reviewGeneratedAt: review.generatedAt.toISOString(),
            updatedAt: new Date(this.now()),
          },
        })
        .returning();
      return { ...row.feedback!, updatedAt: row.updatedAt.toISOString() };
    });
  }

  async drafts(userId: string, accountId: string | null) {
    return this.db.transaction(async (tx) => {
      if (!(await this.currentAccount(tx, userId, accountId))) return [];
      const rows = await tx
        .select()
        .from(draftSnapshot)
        .where(
          and(eq(draftSnapshot.userId, userId), accountCondition(accountId)),
        )
        .orderBy(desc(draftSnapshot.createdAt), desc(draftSnapshot.id))
        .limit(50);
      return rows.map(snapshotValue);
    });
  }
  async createDraft(
    userId: string,
    accountId: string | null,
    input: DraftSnapshotInput,
  ) {
    const data = validate(draftSnapshotInputSchema, input);
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId, accountId);
      if (data.matchId !== null)
        await this.ownMatch(tx, userId, accountId, data.matchId);
      await tx
        .delete(draftSnapshot)
        .where(
          and(
            eq(draftSnapshot.userId, userId),
            sql`${draftSnapshot.accountId} is distinct from ${accountId}`,
          ),
        );
      const [size] = await tx
        .select({ total: count() })
        .from(draftSnapshot)
        .where(eq(draftSnapshot.userId, userId));
      if (size.total >= 50)
        throw new LibraryError(
          "Your 50 saved drafts are full. Delete a snapshot before saving another.",
          409,
        );
      const time = new Date(this.now());
      const [row] = await tx
        .insert(draftSnapshot)
        .values({
          id: randomUUID(),
          userId,
          accountId,
          input: data.input,
          chosenHeroId: data.chosenHeroId,
          matchId: data.matchId === null ? null : BigInt(data.matchId),
          createdAt: time,
          updatedAt: time,
        })
        .returning();
      return snapshotValue(row);
    });
  }
  async updateDraft(
    userId: string,
    accountId: string | null,
    id: string,
    input: z.input<typeof draftUpdateSchema>,
  ) {
    const patch = validate(draftUpdateSchema, input);
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId, accountId);
      const condition = and(
        eq(draftSnapshot.userId, userId),
        accountCondition(accountId),
        eq(draftSnapshot.id, id),
      );
      const [existing] = await tx.select().from(draftSnapshot).where(condition);
      if (!existing)
        throw new LibraryError("This saved draft is unavailable.", 404);
      const data = validate(draftSnapshotInputSchema, {
        input: existing.input,
        chosenHeroId:
          patch.chosenHeroId === undefined
            ? existing.chosenHeroId
            : patch.chosenHeroId,
        matchId:
          patch.matchId === undefined
            ? existing.matchId === null
              ? null
              : String(existing.matchId)
            : patch.matchId,
      });
      // Recheck any retained match association even when only changing the choice.
      if (data.matchId !== null)
        await this.ownMatch(tx, userId, accountId, data.matchId);
      const [row] = await tx
        .update(draftSnapshot)
        .set({
          chosenHeroId: data.chosenHeroId,
          matchId: data.matchId === null ? null : BigInt(data.matchId),
          updatedAt: new Date(this.now()),
        })
        .where(condition)
        .returning();
      return snapshotValue(row);
    });
  }
  async deleteDraft(userId: string, accountId: string | null, id: string) {
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId, accountId);
      const deleted = await tx
        .delete(draftSnapshot)
        .where(
          and(
            eq(draftSnapshot.userId, userId),
            accountCondition(accountId),
            eq(draftSnapshot.id, id),
          ),
        )
        .returning();
      if (!deleted.length)
        throw new LibraryError("This saved draft is unavailable.", 404);
      return { deleted: true as const };
    });
  }

  async usage(userId: string) {
    const day = new Date(this.now()).toISOString().slice(0, 10);
    const rows = await this.db
      .select()
      .from(reviewBudget)
      .where(
        and(eq(reviewBudget.ownerId, userId), eq(reviewBudget.period, day)),
      );
    const counter = (key: string, allowance: number) => {
      const row = rows.find((row) => row.key === key);
      const attempts = row?.attempts ?? 0;
      return {
        attempts,
        allowance,
        remaining: Math.max(0, allowance - attempts),
        estimatedCostUsd: (row?.usedMicros ?? 0) / 1000000,
      };
    };
    return {
      day,
      resetsAt: new Date(
        Date.parse(`${day}T00:00:00Z`) + 86400000,
      ).toISOString(),
      enabled: Boolean(this.config.openaiApiKey),
      reviews: counter(`user:${userId}`, this.config.reviewUserDailyLimit),
      drafts: counter(`user:draft:${userId}`, this.config.draftUserDailyLimit),
      coaching: counter(`user:coach:${userId}`, 10),
      costBasis: "settled_or_reserved_estimate" as const,
    };
  }

  private async retained(userId: string, accountId: string | null) {
    return this.db.transaction(async (tx) => {
      if (!(await this.lockHistory(tx, userId, accountId)))
        return { games: [], reviews: [], annotations: [] };
      const games = await tx
        .select()
        .from(playerMatch)
        .where(eq(playerMatch.userId, userId))
        .orderBy(desc(playerMatch.startedAt))
        .limit(1000);
      const reviews = await tx
        .select()
        .from(matchReview)
        .where(
          and(
            eq(matchReview.userId, userId),
            eq(matchReview.accountId, accountId!),
          ),
        )
        .limit(200);
      const annotations = await tx
        .select()
        .from(matchAnnotation)
        .where(
          and(
            eq(matchAnnotation.userId, userId),
            eq(matchAnnotation.accountId, accountId!),
          ),
        )
        .limit(200);
      return { games, reviews, annotations };
    });
  }
  async heroes(userId: string, accountId: string | null) {
    const { games, reviews, annotations } = await this.retained(
      userId,
      accountId,
    );
    return heroCatalog
      .filter((hero) => games.some((game) => game.heroId === hero.id))
      .map((hero) => {
        const ids = new Set(
          games
            .filter((game) => game.heroId === hero.id)
            .map((game) => String(game.matchId)),
        );
        return {
          ...summarizeHero(games, hero.id),
          reviewedGames: reviews.filter((row) => ids.has(String(row.matchId)))
            .length,
          notedGames: annotations.filter(
            (row) => row.note && ids.has(String(row.matchId)),
          ).length,
        };
      })
      .sort(
        (a, b) => b.games - a.games || a.hero.name.localeCompare(b.hero.name),
      );
  }
  async hero(userId: string, accountId: string | null, heroId: number) {
    if (!heroCatalog.some((hero) => hero.id === heroId))
      throw new LibraryError("Unknown hero.", 404);
    const { games, reviews, annotations } = await this.retained(
      userId,
      accountId,
    );
    const own = games.filter((game) => game.heroId === heroId),
      ids = new Set(own.map((game) => String(game.matchId)));
    return {
      ...summarizeHero(own, heroId),
      reviewedGames: reviews.filter((row) => ids.has(String(row.matchId)))
        .length,
      notedGames: annotations.filter(
        (row) => row.note && ids.has(String(row.matchId)),
      ).length,
      matches: own.slice(0, 100).map((game) => ({
        matchId: String(game.matchId),
        startedAt: game.startedAt,
        result: game.result,
        note: (() => {
          const row = annotations.find((row) => row.matchId === game.matchId);
          return row ? noteValue(row) : null;
        })(),
        reviewExcerpt:
          reviews.find((row) => row.matchId === game.matchId)?.data.content
            .summary ?? null,
      })),
      coverage: "retained_summaries" as const,
      caution:
        "Aggregates use retained summaries; match details show up to 100 recent games. Missing values are excluded from averages. Results do not establish that a hero choice caused an outcome.",
    };
  }
  async reflection(
    userId: string,
    accountId: string | null,
    input: z.input<typeof reflectionQuerySchema>,
  ) {
    const query = validate(reflectionQuerySchema, input),
      { games, reviews, annotations } = await this.retained(userId, accountId);
    const selected = selectSession(games, query.mode, query.day),
      ids = new Set(selected.map((game) => String(game.matchId)));
    return summarizeSession(
      selected,
      query.mode,
      query.mode === "day" ? query.day! : null,
      reviews.filter((row) => ids.has(String(row.matchId))).length,
      annotations.filter((row) => row.note && ids.has(String(row.matchId)))
        .length,
    );
  }
}
