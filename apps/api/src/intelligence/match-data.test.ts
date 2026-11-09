import { expect, test } from "vitest";
import { OpenDota } from "../dota/opendota";
import { matchDetailSchema } from "../dota/schemas";
import { matchEvidence } from "./service";
const base = {
  match_id: 123,
  start_time: 1700000000,
  duration: 10000,
  version: 22,
  patch: 60,
  game_mode: 22,
};
function client(match: unknown) {
  return new OpenDota(undefined, async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/heroes"))
      return Response.json({ 1: { id: 1, localized_name: "Anti-Mage" } });
    if (path.endsWith("/items"))
      return Response.json({
        blink: {
          id: 1,
          dname: "Blink Dagger",
          img: "/apps/dota2/images/items/blink.png",
        },
      });
    if (path.endsWith("/cluster") || path.endsWith("/region"))
      return Response.json({});
    return Response.json(match);
  });
}
test("parsed detail retains zero and unknown samples, recorded purchases and events", async () => {
  const match = await client({
    ...base,
    objectives: [
      { time: 100, type: "building_kill", key: "tower", player_slot: 0 },
    ],
    teamfights: [{ start: 120, end: 140, deaths: 0 }],
    players: [
      {
        hero_id: 1,
        player_slot: 0,
        lane_role: 1,
        times: [0, 60, 120],
        gold_t: [0, null, 100],
        xp_t: [0, 30],
        purchase_log: [
          { time: -80, key: "blink" },
          { time: 10100, key: "blink" },
          { time: 90, key: "unknown" },
        ],
        kills_log: [{ time: 125, key: "npc_dota_hero_axe" }],
      },
    ],
  }).match("123");
  expect(matchDetailSchema.safeParse(match).success).toBe(true);
  expect(match.players[0]!.minuteSamples).toEqual([
    { time: 0, gold: 0, experience: 0, lastHits: null },
    { time: 60, gold: null, experience: 30, lastHits: null },
    { time: 120, gold: 100, experience: null, lastHits: null },
  ]);
  expect(match.players[0]!.actualRole).toBeNull();
  expect(match.players[0]!.purchases).toEqual([
    {
      time: -80,
      key: "blink",
      itemId: 1,
      name: "Blink Dagger",
      image:
        "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/blink.png",
    },
    { time: 90, key: "unknown", itemId: null, name: null, image: null },
  ]);
  expect(matchEvidence(match).moments.map((e) => e.kind)).toEqual([
    "objective",
    "teamfight",
    "kill",
  ]);
  expect(matchEvidence(match).moments[1]!.deaths).toBe(0);
});
test("parsed match arrays are capped and absent data stays unknown", async () => {
  const player = {
    hero_id: 1,
    player_slot: 0,
    times: Array.from({ length: 200 }, (_, i) => i * 30),
    gold_t: Array(200).fill(0),
    purchase_log: Array.from({ length: 200 }, (_, i) => ({
      time: i,
      key: "blink",
    })),
    kills_log: Array.from({ length: 200 }, (_, i) => ({
      time: i,
      key: "npc_dota_hero_axe",
    })),
  };
  const match = await client({ ...base, players: [player] }).match("123");
  expect(match.players[0]!.purchases).toHaveLength(100);
  expect(match.players[0]!.minuteSamples).toHaveLength(121);
  expect(match.players[0]!.killEvents).toHaveLength(100);
  expect(matchEvidence(match).moments).toHaveLength(100);
  const missing = await client({
    ...base,
    players: [{ hero_id: 1, player_slot: 0 }],
  }).match("123");
  expect(missing.players[0]!.minuteSamples).toBeNull();
  expect(missing.players[0]!.purchases).toBeNull();
  expect(missing.objectives).toBeNull();
});

test("malformed sample ordering cannot put the timeline backwards or misalign values", async () => {
  const match = await client({
    ...base,
    players: [
      {
        hero_id: 1,
        player_slot: 0,
        times: [0, 120, 60, 90, 180],
        gold_t: [0, 120, 60, 90, 180],
      },
    ],
  }).match("123");
  expect(
    match.players[0]!.minuteSamples?.map((sample) => [
      sample.time,
      sample.gold,
    ]),
  ).toEqual([
    [0, 0],
    [120, 120],
    [180, 180],
  ]);
});
