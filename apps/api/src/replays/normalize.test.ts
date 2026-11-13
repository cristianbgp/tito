import { expect, it } from "vitest";
import { normalizeReplay } from "./normalize";
import { replayData } from "./test-fixtures";

it("normalizes a private lobby without OpenDota and resolves heroes, item names and images", () => {
  const match = normalizeReplay(replayData(), "42");
  expect(match).toMatchObject({
    id: "900",
    source: "replay",
    lobbyType: 1,
    gameMode: 2,
    winner: "radiant",
    parsed: true,
  });
  expect(match.players).toHaveLength(10);
  expect(match.players[0]).toMatchObject({
    hero: "Sven",
    accountId: "42",
    kills: 0,
    denies: 0,
  });
  expect(match.players[0].inventory[0]).toMatchObject({
    id: 116,
    name: "Black King Bar",
    image: expect.stringContaining("black_king_bar"),
  });
  expect(match.players[0].purchases?.[0].name).toBe("Black King Bar");
  expect(match.goldAdvantage).toEqual([
    { time: 0, value: 0 },
    { time: 60, value: 100 },
    { time: 120, value: 300 },
  ]);
});

it("rejects matches without the linked Steam player, invalid identities and partial games", () => {
  expect(() => normalizeReplay(replayData(), "999")).toThrow(/Steam account/);
  const duplicate = replayData();
  duplicate.players[1].player_slot = 0;
  expect(() => normalizeReplay(duplicate, "42")).toThrow();
  expect(() =>
    normalizeReplay({ ...replayData(), match_id: 0 }, "42"),
  ).toThrow();
  expect(() =>
    normalizeReplay({ ...replayData(), radiant_win: null }, "42"),
  ).toThrow();
});
