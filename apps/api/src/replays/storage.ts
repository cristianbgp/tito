import { and, desc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import type { Database } from "../db";
import { matchDetailSchema, recentMatchSchema } from "../dota/schemas";
import { playerMatch, playerSync } from "../history/schema";
import { replayMatch } from "./schema";
import { ReplayError } from "./errors";

export const replayRetention = 50;
export async function readReplay(
  db: Database,
  userId: string,
  matchId: string,
) {
  const [row] = await db
    .select()
    .from(replayMatch)
    .where(
      and(
        eq(replayMatch.userId, userId),
        eq(replayMatch.matchId, BigInt(matchId)),
      ),
    );
  return row ? matchDetailSchema.parse(row.data) : null;
}
export async function saveReplay(
  db: Database,
  userId: string,
  accountId: string,
  value: z.infer<typeof matchDetailSchema>,
  maxMatches: number,
  signal?: AbortSignal,
) {
  const match = matchDetailSchema.parse(value);
  const own = match.players.find((p) => p.accountId === accountId);
  if (!own)
    throw new ReplayError(
      "Your linked Steam account is not a player in this replay.",
      403,
    );
  const summary = recentMatchSchema.parse({
    ...own,
    id: match.id,
    accountId,
    startedAt: match.startedAt,
    duration: match.duration,
    gameMode: match.gameMode,
    lobbyType: match.lobbyType,
    patch: match.patch,
    result:
      match.winner == null ? null : match.winner === own.team ? "win" : "loss",
    source: "replay",
  });
  const now = new Date();
  return db.transaction(async (tx) => {
    if (signal?.aborted)
      throw new ReplayError("Replay import was cancelled.", 409);
    await tx
      .insert(playerSync)
      .values({
        userId,
        accountId,
        lastAttemptAt: now,
        nextSyncAt: new Date(0),
      })
      .onConflictDoNothing();
    const [state] = await tx
      .select()
      .from(playerSync)
      .where(eq(playerSync.userId, userId))
      .for("update");
    if (
      state.accountId !== accountId ||
      (state.leaseUntil && state.leaseUntil > now)
    )
      throw new ReplayError(
        "Wait for match sync to finish before importing this replay.",
        409,
      );
    const oldest = await tx
      .select({ id: playerMatch.matchId })
      .from(playerMatch)
      .where(eq(playerMatch.userId, userId))
      .orderBy(desc(playerMatch.matchId))
      .limit(1)
      .offset(maxMatches - 1);
    const oldestReplay = await tx
      .select({ id: playerMatch.matchId })
      .from(playerMatch)
      .where(
        and(eq(playerMatch.userId, userId), eq(playerMatch.source, "replay")),
      )
      .orderBy(desc(playerMatch.matchId))
      .limit(1)
      .offset(replayRetention - 1);
    if ([...oldest, ...oldestReplay].some((row) => BigInt(match.id) < row.id))
      throw new ReplayError(
        "This replay is older than your retained match history.",
        409,
      );
    const { id, accountId: _account, actualRole: _role, ...fields } = summary;
    await tx
      .insert(playerMatch)
      .values({ ...fields, userId, matchId: BigInt(id) })
      .onConflictDoUpdate({
        target: [playerMatch.userId, playerMatch.matchId],
        set: fields,
      });
    await tx
      .insert(replayMatch)
      .values({ userId, matchId: BigInt(id), data: match })
      .onConflictDoUpdate({
        target: [replayMatch.userId, replayMatch.matchId],
        set: { data: match, importedAt: now },
      });
    await tx.execute(
      sql`delete from player_match where user_id = ${userId} and match_id in (select match_id from player_match where user_id = ${userId} and source = 'replay' order by match_id desc offset ${replayRetention})`,
    );
    await tx.execute(
      sql`delete from player_match where user_id = ${userId} and match_id in (select match_id from player_match where user_id = ${userId} order by match_id desc offset ${maxMatches})`,
    );
    if (signal?.aborted)
      throw new ReplayError("Replay import was cancelled.", 409);
    return match.id;
  });
}
