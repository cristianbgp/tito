import { expect, it } from "vitest";
import {
  summarizeHero,
  selectSession,
  summarizeSession,
  type RetainedGame,
} from "./summary";
const game = (
  matchId: bigint,
  startedAt: number,
  overrides: Partial<RetainedGame> = {},
): RetainedGame => ({
  userId: "one",
  matchId,
  startedAt,
  duration: 1200,
  heroId: 5,
  hero: "Crystal Maiden",
  heroImage: null,
  actualRole: null,
  patch: null,
  gameMode: null,
  lobbyType: null,
  source: "opendota",
  result: null,
  kills: null,
  deaths: null,
  assists: null,
  goldPerMinute: null,
  experiencePerMinute: null,
  ...overrides,
});
it("excludes missing metrics without discarding observed zero or unknown results", () => {
  const result = summarizeHero(
    [
      game(1n, 100, { kills: 0, deaths: 0, result: "win" }),
      game(2n, 200, { kills: 10 }),
      game(3n, 300),
    ],
    5,
  );
  expect(result).toMatchObject({
    games: 3,
    knownResults: 1,
    wins: 1,
    winRate: 1,
    kills: 5,
    deaths: 0,
    assists: null,
  });
  expect(summarizeHero([], 5)).toMatchObject({
    games: 0,
    winRate: null,
    kills: null,
  });
});
it("selects the latest contiguous session with a two-hour gap after game end", () => {
  const games = [
    game(1n, 100),
    game(2n, 9000),
    game(3n, 10000),
    game(4n, 20000),
  ];
  expect(selectSession(games, "latest").map((g) => g.matchId)).toEqual([4n]);
  expect(
    selectSession(games.slice(0, 3), "latest").map((g) => g.matchId),
  ).toEqual([3n, 2n]);
  expect(
    selectSession(
      [
        game(5n, Date.parse("2026-11-07T00:00:00Z") / 1000),
        game(6n, Date.parse("2026-11-08T00:00:00Z") / 1000),
      ],
      "day",
      "2026-11-07",
    ).map((g) => g.matchId),
  ).toEqual([5n]);
});
it("returns an explicit empty reflection and observed-only aggregate", () => {
  expect(summarizeSession([], "latest", null, 0, 0)).toMatchObject({
    games: 0,
    kills: null,
    knownResults: 0,
    summary: expect.stringContaining("No retained"),
  });
  expect(
    summarizeSession(
      [game(1n, 10, { result: "loss", kills: 0 })],
      "latest",
      null,
      0,
      0,
    ),
  ).toMatchObject({
    games: 1,
    kills: 0,
    losses: 1,
    wins: 0,
    durationSeconds: 1200,
  });
});
