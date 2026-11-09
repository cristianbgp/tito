import { heroCatalog } from "../draft/catalog";
import type { playerMatch } from "../history/schema";
export type RetainedGame = typeof playerMatch.$inferSelect;
const mean = (values: Array<number | null>) => {
  const observed = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  return observed.length
    ? observed.reduce((a, b) => a + b, 0) / observed.length
    : null;
};
export function summarizeHero(games: RetainedGame[], heroId: number) {
  const rows = games.filter((game) => game.heroId === heroId);
  const knownResults = rows.filter((game) => game.result !== null).length;
  const wins = rows.filter((game) => game.result === "win").length;
  return {
    hero: heroCatalog.find((hero) => hero.id === heroId)!,
    games: rows.length,
    knownResults,
    wins,
    winRate: knownResults ? wins / knownResults : null,
    kills: mean(rows.map((game) => game.kills)),
    deaths: mean(rows.map((game) => game.deaths)),
    assists: mean(rows.map((game) => game.assists)),
    goldPerMinute: mean(rows.map((game) => game.goldPerMinute)),
    experiencePerMinute: mean(rows.map((game) => game.experiencePerMinute)),
  };
}
export function selectSession(
  games: RetainedGame[],
  mode: "latest" | "day",
  day?: string,
) {
  const ordered = [...games].sort((a, b) => b.startedAt - a.startedAt);
  if (mode === "day")
    return ordered.filter(
      (game) =>
        new Date(game.startedAt * 1000).toISOString().slice(0, 10) === day,
    );
  const result: RetainedGame[] = [];
  for (const game of ordered) {
    const newer = result.at(-1);
    if (
      newer &&
      newer.startedAt - (game.startedAt + Math.max(0, game.duration)) > 7200
    )
      break;
    result.push(game);
  }
  return result;
}
export function summarizeSession(
  games: RetainedGame[],
  mode: "latest" | "day",
  day: string | null,
  reviewedGames: number,
  notedGames: number,
) {
  const wins = games.filter((game) => game.result === "win").length;
  const losses = games.filter((game) => game.result === "loss").length;
  return {
    mode,
    day,
    matchIds: games.map((game) => String(game.matchId)),
    games: games.length,
    knownResults: wins + losses,
    wins,
    losses,
    durationSeconds: games.reduce(
      (sum, game) => sum + Math.max(0, game.duration),
      0,
    ),
    kills: mean(games.map((game) => game.kills)),
    deaths: mean(games.map((game) => game.deaths)),
    assists: mean(games.map((game) => game.assists)),
    reviewedGames,
    notedGames,
    summary: games.length
      ? `${games.length} retained games: ${wins} wins and ${losses} losses across ${wins + losses} known results. Match summaries describe outcomes; they do not explain why they happened.`
      : "No retained matches in this session. Import your own match history to reflect on a session.",
    coverage: "retained_summaries" as const,
  };
}
