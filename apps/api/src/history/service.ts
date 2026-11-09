import { randomUUID } from "node:crypto";
import { and, count, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import type { Database } from "../db";
import type { z } from "zod";
import type { recentMatchSchema } from "../dota/schemas";
import { HistoryError, type SavedHistory, type SyncMode } from "./contracts";
import { playerMatch, playerSync } from "./schema";
import { summarizeProgress } from "./progress";

type Summary = z.infer<typeof recentMatchSchema>;
type Source = {
  historyMatches: (accountId: string, offset: number) => Promise<Summary[]>;
  recentMatches?: (accountId: string, refresh?: boolean) => Promise<Summary[]>;
};
type Options = {
  maxMatches: number;
  cooldownSeconds: number;
  now?: () => number;
};

export class HistoryService {
  private now: () => number;
  constructor(
    private db: Database,
    private source: Source,
    private options: Options,
  ) {
    this.now = options.now ?? Date.now;
  }

  async read(
    userId: string,
    accountId: string,
    limit: number,
  ): Promise<SavedHistory> {
    // One transaction gives a consistent identity + summary view during account replacement.
    return this.db.transaction(async (tx) => {
      const [state] = await tx
        .select()
        .from(playerSync)
        .where(eq(playerSync.userId, userId))
        .for("share");
      const own = state?.accountId === accountId;
      const rows = own
        ? await tx
            .select()
            .from(playerMatch)
            .where(eq(playerMatch.userId, userId))
            .orderBy(desc(playerMatch.matchId))
            .limit(Math.min(1000, Math.max(1, limit)))
        : [];
      const [size] = own
        ? await tx
            .select({ total: count() })
            .from(playerMatch)
            .where(eq(playerMatch.userId, userId))
        : [{ total: 0 }];
      return {
        accountId,
        matches: rows.map(({ matchId, userId: _owner, ...row }) => ({
          ...row,
          id: String(matchId),
          accountId,
        })),
        total: size.total,
        lastSyncedAt: own ? (state.lastSyncedAt?.toISOString() ?? null) : null,
        nextSyncAt: state?.nextSyncAt.toISOString() ?? null,
        hasOlder: own
          ? state.hasOlder &&
            (size.total < this.options.maxMatches ||
              state.olderOffset < this.options.maxMatches)
          : true,
        retentionLimit: this.options.maxMatches,
        importSize: 100,
      };
    });
  }

  async progress(userId: string, accountId: string) {
    const asOf = this.now();
    const history = await this.read(userId, accountId, 1000);
    return {
      accountId,
      retainedMatches: history.total,
      retentionLimit: history.retentionLimit,
      lastSyncedAt: history.lastSyncedAt,
      ...summarizeProgress(history.matches, asOf),
    };
  }

  async sync(userId: string, accountId: string, mode: SyncMode) {
    const time = new Date(this.now());
    const token = randomUUID();
    const leaseUntil = new Date(+time + 45_000);
    const nextSyncAt = new Date(+time + this.options.cooldownSeconds * 1000);
    const [state] = await this.db
      .insert(playerSync)
      .values({
        userId,
        accountId,
        lastAttemptAt: time,
        nextSyncAt,
        leaseToken: token,
        leaseUntil,
      })
      .onConflictDoUpdate({
        target: playerSync.userId,
        set: { lastAttemptAt: time, nextSyncAt, leaseToken: token, leaseUntil },
        setWhere: and(
          lte(playerSync.nextSyncAt, time),
          or(isNull(playerSync.leaseUntil), lte(playerSync.leaseUntil, time)),
        ),
      })
      .returning();
    if (!state) {
      const [busy] = await this.db
        .select()
        .from(playerSync)
        .where(eq(playerSync.userId, userId));
      throw new HistoryError(
        "Wait before syncing again. Your saved matches are still available.",
        429,
        Math.max(
          1,
          Math.ceil((+(busy?.nextSyncAt ?? nextSyncAt) - +time) / 1000),
        ),
      );
    }
    try {
      const existing =
        state.accountId === accountId
          ? await this.db
              .select({ matchId: playerMatch.matchId })
              .from(playerMatch)
              .where(eq(playerMatch.userId, userId))
          : [];
      if (
        mode === "older" &&
        existing.length &&
        (!state.hasOlder ||
          (existing.length >= this.options.maxMatches &&
            state.olderOffset >= this.options.maxMatches))
      )
        throw new HistoryError(
          "Your saved history is up to date or has reached its retention limit.",
          409,
        );
      const offset =
        mode === "older" && existing.length
          ? Math.max(0, state.olderOffset - 10)
          : 0;
      const known = new Set(existing.map((row) => String(row.matchId)));
      let fetched: Summary[];
      let usedRecent = false;
      if (mode === "latest" && existing.length && this.source.recentMatches) {
        const recent = (await this.source.recentMatches(accountId, true)).slice(
          0,
          20,
        );
        if (recent.some((match) => match.accountId !== accountId))
          throw new Error("Unexpected history account identity");
        if (recent.some((match) => known.has(match.id))) {
          fetched = recent;
          usedRecent = true;
        } else {
          // A long absence can put every recent match beyond our retained window.
          // Keep the bounded archive path so a fast sync cannot silently skip the gap.
          fetched = await this.source.historyMatches(accountId, offset);
        }
      } else {
        fetched = await this.source.historyMatches(accountId, offset);
      }
      const unique = [
        ...new Map(
          fetched.slice(0, 100).map((match) => [match.id, match]),
        ).values(),
      ];
      if (unique.some((match) => match.accountId !== accountId))
        throw new Error("Unexpected history account identity");
      const newCount = unique.filter((match) => !known.has(match.id)).length;
      const overlap = unique.some((match) => known.has(match.id));
      const olderOffset =
        mode === "older"
          ? offset + fetched.length
          : !existing.length || !overlap
            ? fetched.length
            : state.olderOffset + newCount;
      await this.db.transaction(async (tx) => {
        const [lease] = await tx
          .select()
          .from(playerSync)
          .where(eq(playerSync.userId, userId))
          .for("update");
        if (
          lease?.leaseToken !== token ||
          !lease.leaseUntil ||
          +lease.leaseUntil <= this.now()
        )
          throw new HistoryError(
            "This sync expired. Sync again to get the latest matches.",
            409,
          );
        if (state.accountId !== accountId)
          await tx.delete(playerMatch).where(eq(playerMatch.userId, userId));
        if (unique.length) {
          await tx
            .insert(playerMatch)
            .values(
              unique.map(({ id, accountId: _account, ...row }) => ({
                ...row,
                userId,
                matchId: BigInt(id),
                // Role is exclusively confirmed by the owner in a match note.
                actualRole: null,
              })),
            )
            .onConflictDoUpdate({
              target: [playerMatch.userId, playerMatch.matchId],
              set: {
                startedAt: sql`excluded.started_at`,
                duration: sql`excluded.duration`,
                heroId: sql`excluded.hero_id`,
                gameMode: sql`coalesce(excluded.game_mode, ${playerMatch.gameMode})`,
                lobbyType: sql`coalesce(excluded.lobby_type, ${playerMatch.lobbyType})`,
                patch: sql`coalesce(excluded.patch, ${playerMatch.patch})`,
                hero: sql`case when excluded.hero = 'Hero ' || excluded.hero_id and excluded.hero_id = ${playerMatch.heroId} then ${playerMatch.hero} else excluded.hero end`,
                heroImage: sql`coalesce(excluded.hero_image, ${playerMatch.heroImage})`,
                result: sql`coalesce(excluded.result, ${playerMatch.result})`,
                kills: sql`coalesce(excluded.kills, ${playerMatch.kills})`,
                deaths: sql`coalesce(excluded.deaths, ${playerMatch.deaths})`,
                assists: sql`coalesce(excluded.assists, ${playerMatch.assists})`,
                goldPerMinute: sql`coalesce(excluded.gold_per_minute, ${playerMatch.goldPerMinute})`,
                experiencePerMinute: sql`coalesce(excluded.experience_per_minute, ${playerMatch.experiencePerMinute})`,
              },
            });
        }
        await tx.execute(
          sql`delete from player_match where user_id = ${userId} and match_id in (select match_id from player_match where user_id = ${userId} order by match_id desc offset ${this.options.maxMatches})`,
        );
        await tx
          .update(playerSync)
          .set({
            accountId,
            lastSyncedAt: new Date(this.now()),
            olderOffset,
            hasOlder: usedRecent
              ? state.hasOlder
              : mode === "latest" && existing.length && overlap
                ? state.hasOlder || fetched.length === 100
                : fetched.length === 100,
            leaseToken: null,
            leaseUntil: null,
          })
          .where(
            and(
              eq(playerSync.userId, userId),
              eq(playerSync.leaseToken, token),
            ),
          );
      });
    } catch (error) {
      await this.db
        .update(playerSync)
        .set({ leaseToken: null, leaseUntil: null })
        .where(
          and(eq(playerSync.userId, userId), eq(playerSync.leaseToken, token)),
        );
      throw error;
    }
    return this.read(userId, accountId, 100);
  }
}
