import { describe, expect, it } from "vitest";
import type { RecentMatch } from "../api/generated/models";
import {
  readHistoryFilters,
  filterHistory,
  summarizeHistory,
  heroPerformance,
  historySearch,
} from "./match-history";

const games: RecentMatch[] = [
  {
    id: "101",
    accountId: "42",
    heroId: 1,
    hero: "Anti-Mage",
    heroImage: null,
    result: "win",
    startedAt: 300,
    duration: 1800,
    kills: 3,
    deaths: 1,
    assists: 4,
    goldPerMinute: 600,
    experiencePerMinute: null,
  },
  {
    id: "102",
    accountId: "42",
    heroId: 39,
    hero: "Queen of Pain",
    heroImage: null,
    result: "loss",
    startedAt: 200,
    duration: 2400,
    kills: 9,
    deaths: 6,
    assists: 4,
    goldPerMinute: 400,
    experiencePerMinute: 500,
  },
  {
    id: "103",
    accountId: "42",
    heroId: 1,
    hero: "Anti-Mage",
    heroImage: null,
    result: null,
    startedAt: 100,
    duration: 1200,
    kills: null,
    deaths: null,
    assists: null,
    goldPerMinute: null,
    experiencePerMinute: 700,
  },
];
const defaults = { hero: "", result: "all", sort: "newest" } as const;

describe("recent match exploration", () => {
  it("separates ranked queues from modes, combines filters, and keeps missing metadata unknown", () => {
    const sample = [
      { ...games[0], id: "1", gameMode: 22, lobbyType: 7 },
      { ...games[0], id: "2", gameMode: 1, lobbyType: 0 },
      { ...games[0], id: "3", gameMode: 23, lobbyType: 0 },
      { ...games[0], id: "4", gameMode: 4, lobbyType: 0 },
      { ...games[0], id: "5", gameMode: 22, lobbyType: null },
      { ...games[0], id: "6", gameMode: null, lobbyType: 5 },
      { ...games[0], id: "7", gameMode: 3, lobbyType: 6 },
      { ...games[0], id: "8", gameMode: 18, lobbyType: 2 },
      { ...games[0], id: "9", gameMode: 0 },
    ];
    const ids = (params: string) =>
      filterHistory(
        sample,
        readHistoryFilters(new URLSearchParams(params)),
      ).map((m) => m.id);
    expect(ids("queue=ranked")).toEqual(["1", "6", "7"]);
    expect(ids("gameMode=all-pick")).toEqual(["1", "2", "5"]);
    expect(ids("queue=normal&gameMode=23")).toEqual(["3"]);
    expect(ids("gameMode=4")).toEqual(["4"]);
    expect(ids("queue=other")).toEqual(["8"]);
    expect(ids("queue=unknown")).toEqual(["5", "9"]);
    expect(ids("gameMode=unknown")).toEqual(["6", "9"]);
    expect(ids("queue=ranked&gameMode=23")).toEqual([]);
  });
  it("round trips queue and mode through match links and ignores malformed values", () => {
    const parsed = readHistoryFilters(
      new URLSearchParams("queue=ranked&gameMode=4&result=win"),
    );
    expect(historySearch("42", parsed)).toBe(
      "player=42&result=win&queue=ranked&gameMode=4",
    );
    expect(
      readHistoryFilters(new URLSearchParams(historySearch("42", parsed))),
    ).toEqual(parsed);
    expect(
      readHistoryFilters(new URLSearchParams("queue=oops&gameMode=-1")),
    ).toEqual(defaults);
  });
  it("normalizes unknown URL values and bounds text without losing spaces while typing", () => {
    expect(
      readHistoryFilters(
        new URLSearchParams("hero=Queen+&result=oops&sort=oops"),
      ),
    ).toEqual({ ...defaults, hero: "Queen " });
    expect(
      readHistoryFilters(
        new URLSearchParams({
          hero: "x".repeat(100),
          result: "unknown",
          sort: "longest",
        }),
      ),
    ).toEqual({ hero: "x".repeat(80), result: "unknown", sort: "longest" });
  });
  it("searches hero names and match IDs and keeps unknown results distinct", () => {
    expect(
      filterHistory(games, { ...defaults, hero: "  QUEEN OF pain  " }).map(
        (g) => g.id,
      ),
    ).toEqual(["102"]);
    expect(
      filterHistory(games, { ...defaults, hero: "103", result: "unknown" }).map(
        (g) => g.id,
      ),
    ).toEqual(["103"]);
    expect(
      filterHistory(games, { ...defaults, result: "loss" }).map((g) => g.id),
    ).toEqual(["102"]);
  });
  it("sorts copies of cached matches and excludes unavailable results from win rate", () => {
    expect(
      filterHistory(games, { ...defaults, sort: "oldest" }).map((g) => g.id),
    ).toEqual(["103", "102", "101"]);
    expect(
      filterHistory(games, { ...defaults, sort: "longest" }).map((g) => g.id),
    ).toEqual(["102", "101", "103"]);
    expect(
      filterHistory(games, { ...defaults, sort: "shortest" }).map((g) => g.id),
    ).toEqual(["103", "101", "102"]);
    expect(games.map((g) => g.id)).toEqual(["101", "102", "103"]);
    expect(summarizeHistory(games)).toEqual({
      total: 3,
      wins: 1,
      losses: 1,
      unknown: 1,
      winRate: 0.5,
    });
    expect(summarizeHistory([games[2]]).winRate).toBeNull();
    expect(summarizeHistory([]).winRate).toBeNull();
  });
  it("keeps canonical player and filter context in URL-safe links and omits defaults", () => {
    const filters = {
      hero: "Queen of Pain",
      result: "loss",
      sort: "longest",
    } as const;
    expect(historySearch("42", filters)).toBe(
      "player=42&hero=Queen+of+Pain&result=loss&sort=longest",
    );
    expect(historySearch("42", defaults)).toBe("player=42");
    expect(
      readHistoryFilters(new URLSearchParams(historySearch("42", filters))),
    ).toEqual(filters);
  });
  it("groups heroes by ID and averages only available samples", () => {
    const heroes = heroPerformance(games);
    expect(heroes.map((h) => h.heroId)).toEqual([1, 39]);
    expect(heroes[0]).toMatchObject({
      hero: "Anti-Mage",
      total: 2,
      wins: 1,
      losses: 0,
      unknown: 1,
      winRate: 1,
      goldPerMinute: 600,
      experiencePerMinute: 700,
    });
    expect(
      heroPerformance([
        { ...games[2], goldPerMinute: null, experiencePerMinute: null },
      ])[0],
    ).toMatchObject({
      winRate: null,
      goldPerMinute: null,
      experiencePerMinute: null,
    });
  });
});
