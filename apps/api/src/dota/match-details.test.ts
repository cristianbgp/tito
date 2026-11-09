import { describe, expect, it } from "vitest";
import { OpenDota } from "./opendota";

const hero = {
  id: 1,
  localized_name: "Anti-Mage",
  img: "/apps/dota2/images/dota_react/heroes/antimage.png?",
  icon: "/apps/dota2/images/dota_react/heroes/icons/antimage.png?",
};
const player = {
  player_slot: 128,
  account_id: 70388657,
  hero_id: 1,
  personaname: "Player <one>",
  name: "Pro name",
  level: 22,
  kills: 8,
  deaths: 3,
  assists: 12,
  last_hits: 240,
  denies: 9,
  gold_per_min: 600,
  xp_per_min: 700,
  net_worth: 19000,
  hero_damage: 23000,
  hero_healing: 0,
  tower_damage: 4000,
  item_0: 1,
  item_1: 0,
  item_2: 99999,
  item_3: 0,
  item_4: 0,
  item_5: 0,
  backpack_0: 0,
  backpack_1: 1,
  backpack_2: 0,
  item_neutral: 1,
  item_neutral2: 0,
  times: [0, 60, 120],
};
const fixture = {
  match_id: 123456789,
  start_time: 1700000000,
  duration: 2400,
  radiant_win: false,
  version: 22,
  game_mode: 22,
  lobby_type: 7,
  cluster: 111,
  radiant_score: 0,
  dire_score: 15,
  radiant_gold_adv: [0, -1000, null],
  radiant_xp_adv: [0, 500, -200],
  players: [player],
};
const catalogs: Record<string, unknown> = {
  "/constants/heroes": { "1": hero },
  "/constants/items": {
    blink: {
      id: 1,
      dname: "Blink Dagger",
      img: "/apps/dota2/images/dota_react/items/blink.png",
    },
  },
  "/constants/cluster": { "111": 1 },
  "/constants/region": { "1": "US WEST" },
};
function client(
  match: unknown = fixture,
  unavailable: string[] = [],
  calls: string[] = [],
  clock = Date.now,
) {
  return new OpenDota(
    "test-key",
    async (input) => {
      const url = new URL(input);
      expect(url.searchParams.get("api_key")).toBe("test-key");
      const path = url.pathname.replace(/^\/api/, "");
      calls.push(path);
      if (unavailable.includes(path))
        return new Response("Unavailable", { status: 503 });
      return Response.json(
        path === "/heroes" ? [hero] : (catalogs[path] ?? match),
      );
    },
    clock,
  );
}

describe("rich match normalization", () => {
  it("uses minute samples when timestamps are absent and keeps unequal series independent", async () => {
    const match = await client({
      ...fixture,
      radiant_gold_adv: [0, null, -400],
      radiant_xp_adv: [0, 200],
      players: [{ ...player, times: undefined }],
    }).match("123456789");
    expect(match.goldAdvantage).toEqual([
      { time: 0, value: 0 },
      { time: 60, value: null },
      { time: 120, value: -400 },
    ]);
    expect(match.experienceAdvantage).toEqual([
      { time: 0, value: 0 },
      { time: 60, value: 200 },
    ]);
  });
  it("preserves overview, public identity, team slots, and complete scoreboard stats", async () => {
    const match = await client().match("123456789");
    expect(match).toMatchObject({
      gameMode: 22,
      lobbyType: 7,
      region: "US WEST",
      radiantScore: 0,
      direScore: 15,
    });
    expect(match.players[0]).toMatchObject({
      accountId: "70388657",
      slot: 128,
      name: "Player <one>",
      hero: "Anti-Mage",
      heroImage:
        "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/antimage.png?",
      level: 22,
      denies: 9,
      netWorth: 19000,
      heroDamage: 23000,
      heroHealing: 0,
      towerDamage: 4000,
    });
  });

  it("distinguishes known, empty, missing, and unknown item slots", async () => {
    const match = await client({
      ...fixture,
      players: [{ ...player, item_3: undefined }],
    }).match("123456789");
    expect(match.players[0].inventory).toHaveLength(6);
    expect(match.players[0].inventory[0]).toMatchObject({
      id: 1,
      name: "Blink Dagger",
    });
    expect(match.players[0].inventory[1]).toEqual({
      id: 0,
      name: null,
      image: null,
    });
    expect(match.players[0].inventory[2]).toEqual({
      id: 99999,
      name: null,
      image: null,
    });
    expect(match.players[0].inventory[3]).toEqual({
      id: null,
      name: null,
      image: null,
    });
    expect(match.players[0].backpack).toHaveLength(3);
    expect(match.players[0].neutralItem.id).toBe(1);
    expect(match.players[0].neutralEnhancement.id).toBe(0);
  });

  it("preserves timeline signs and gaps, using supplied sample times", async () => {
    const match = await client({
      ...fixture,
      players: [{ ...player, times: [0, 75, 150] }],
    }).match("123456789");
    expect(match.goldAdvantage).toEqual([
      { time: 0, value: 0 },
      { time: 75, value: -1000 },
      { time: 150, value: null },
    ]);
    expect(match.experienceAdvantage[2]).toEqual({ time: 150, value: -200 });
  });

  it("keeps basic matches usable without identities, inventories, scores, or timelines", async () => {
    const match = await client({
      match_id: 123456789,
      start_time: 1700000000,
      duration: 60,
      players: [{ hero_id: 1, player_slot: 0, account_id: 4294967295 }],
      version: null,
    }).match("123456789");
    expect(match).toMatchObject({
      parsed: false,
      winner: null,
      radiantScore: null,
      direScore: null,
      goldAdvantage: [],
      experienceAdvantage: [],
    });
    expect(match.players[0]).toMatchObject({
      accountId: null,
      name: null,
      level: null,
      heroHealing: null,
      neutralItem: { id: null },
    });
  });

  it("does not lose match data when catalogs fail or a new item is unknown", async () => {
    const match = await client(fixture, Object.keys(catalogs)).match(
      "123456789",
    );
    expect(match).toMatchObject({
      id: "123456789",
      metadataAvailable: false,
      region: null,
    });
    expect(match.players[0]).toMatchObject({
      heroId: 1,
      heroImage: null,
      kills: 8,
    });
    expect(match.players[0].inventory[0]).toEqual({
      id: 1,
      name: null,
      image: null,
    });
  });

  it("caches catalogs longer than match data", async () => {
    let time = 0;
    const calls: string[] = [];
    const dota = client(fixture, [], calls, () => time);
    await dota.match("123456789");
    time = 61000;
    await dota.match("123456789");
    expect(calls.filter((path) => path === "/matches/123456789")).toHaveLength(
      2,
    );
    expect(calls.filter((path) => path === "/constants/items")).toHaveLength(1);
    expect(calls.filter((path) => path === "/constants/heroes")).toHaveLength(
      1,
    );
  });
});
