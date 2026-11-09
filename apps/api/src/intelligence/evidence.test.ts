import { describe, expect, test } from "vitest";
import { OpenDota } from "../dota/opendota";
import {
  heroEvidenceSchema,
  matchEvidenceSchema,
  patchReferenceSchema,
} from "./contracts";
import { matchEvidence } from "./service";

describe("hero evidence", () => {
  test("resolves popular item IDs through the shared catalog and retains unknown items honestly", async () => {
    let catalogCalls = 0;
    const dota = new OpenDota(undefined, async (value) => {
      const path = new URL(value).pathname;
      if (path.endsWith("/constants/items")) {
        catalogCalls++;
        return Response.json({
          branches: {
            id: 16,
            dname: "Iron Branch",
            img: "/apps/dota2/images/dota_react/items/branches.png",
          },
        });
      }
      if (path.endsWith("/itemPopularity"))
        return Response.json({ start_game_items: { 16: 9, 99999: 1 } });
      if (path.endsWith("/heroes")) return Response.json({});
      if (path.endsWith("/matchups")) return Response.json([]);
      return Response.json({ hero_id: 1, result: {} });
    });
    const first = await dota.heroEvidence(1);
    await dota.heroEvidence(1);
    expect(first.itemPopularity.data?.[0]?.items).toEqual([
      {
        itemId: 16,
        count: 9,
        name: "Iron Branch",
        image:
          "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/branches.png",
      },
      { itemId: 99999, count: 1, name: null, image: null },
    ]);
    expect(catalogCalls).toBe(1);
  });
  test("keeps item popularity usable when catalog metadata is unavailable", async () => {
    const dota = new OpenDota(undefined, async (value) => {
      const path = new URL(value).pathname;
      if (path.endsWith("/constants/items"))
        return new Response(null, { status: 503 });
      if (path.endsWith("/itemPopularity"))
        return Response.json({ start_game_items: { 16: 0 } });
      if (path.endsWith("/heroes")) return Response.json({});
      if (path.endsWith("/matchups")) return Response.json([]);
      return Response.json({ hero_id: 1, result: {} });
    });
    const data = await dota.heroEvidence(1);
    expect(data.itemPopularity.status).toBe("available");
    expect(data.itemPopularity.data?.[0]?.items[0]).toEqual({
      itemId: 16,
      count: 0,
      name: null,
      image: null,
    });
  });
  test("uses five bounded cached requests, preserves retrieval time, and isolates failures", async () => {
    let now = Date.UTC(2026, 10, 7);
    const urls: string[] = [];
    let budget = 0;
    const dota = new OpenDota(
      "secret",
      async (url) => {
        urls.push(url);
        const path = new URL(url).pathname;
        if (path.endsWith("/constants/items")) return Response.json({});
        if (path.endsWith("/heroes"))
          return Response.json({
            1: {
              id: 1,
              localized_name: "Anti-Mage",
              roles: ["Carry"],
              attack_type: "Melee",
            },
          });
        if (path.endsWith("/matchups"))
          return Response.json([{ hero_id: 2, games_played: 10, wins: 0 }]);
        if (path.endsWith("/benchmarks"))
          return new Response(null, { status: 502 });
        return Response.json({
          start_game_items: { "1": 0 },
          early_game_items: { "2": 7 },
        });
      },
      () => now,
      async () => {
        budget++;
      },
    );
    const first = await dota.heroEvidence(1);
    expect(heroEvidenceSchema.safeParse(first).success).toBe(true);
    expect(first.catalog.data?.roles).toEqual(["Carry"]);
    expect(first.matchups.data?.[0]?.winRate).toBe(0);
    expect(first.benchmarks.status).toBe("unavailable");
    expect(first.itemPopularity.data?.[0]?.items[0]?.count).toBe(0);
    now += 1000;
    const second = await dota.heroEvidence(1);
    expect(second.catalog.fetchedAt).toBe(first.catalog.fetchedAt);
    expect(urls.length).toBe(6);
    expect(budget).toBe(6);
    expect(
      urls.every(
        (url) => new URL(url).searchParams.get("api_key") === "secret",
      ),
    ).toBe(true);
    expect(
      urls.some(
        (url) =>
          new URL(url).pathname.endsWith("/benchmarks") &&
          new URL(url).searchParams.get("hero_id") === "1",
      ),
    ).toBe(true);
    await expect(dota.heroEvidence(-1)).rejects.toThrow("hero");
  });
  test("caps aggregate outputs, does not invent cohorts or current patch", async () => {
    const dota = new OpenDota(undefined, async (url) => {
      const path = new URL(url).pathname;
      if (path.endsWith("/heroes")) return Response.json({});
      if (path.endsWith("/matchups"))
        return Response.json(
          Array.from({ length: 200 }, (_, i) => ({
            hero_id: i + 1,
            games_played: 200 - i,
            wins: 0,
          })),
        );
      if (path.endsWith("/benchmarks"))
        return Response.json({
          hero_id: 1,
          result: { gold_per_min: [{ percentile: 0.5, value: 100 }] },
        });
      if (path.endsWith("/patch"))
        return Response.json([
          { id: 60, name: "7.41", date: "2026-03-24T00:50:59.580Z" },
        ]);
      return Response.json({});
    });
    const hero = await dota.heroEvidence(1);
    expect(hero.matchups.data).toHaveLength(150);
    expect(hero.catalog.status).toBe("empty");
    const patches = await dota.patchReferences();
    expect(patchReferenceSchema.safeParse(patches).success).toBe(true);
    expect(patches.data?.[0]?.releasedAt).toBe("2026-03-24T00:50:59.580Z");
    expect(patches.data?.[0]?.sourceUrl).toBe(
      "https://www.dota2.com/patches/7.41",
    );
  });
});

test("review evidence distinguishes missing arrays from recorded empty arrays", () => {
  const detail: any = {
    id: "1",
    parsed: false,
    players: [{ heroId: 1, slot: 0 }],
    objectives: null,
    teamfights: null,
  };
  const missing = matchEvidence(detail);
  expect(matchEvidenceSchema.safeParse(missing).success).toBe(true);
  expect(missing.coverage).toEqual({
    purchases: false,
    minuteSamples: false,
    moments: false,
  });
  detail.players[0].purchases = [];
  detail.players[0].minuteSamples = [];
  detail.players[0].killEvents = [];
  expect(matchEvidence(detail).coverage).toEqual({
    purchases: true,
    minuteSamples: true,
    moments: true,
  });
});

test("official Valve notes preserve dates, filter hero pool and share bounded cache without leaking API key", async () => {
  const urls: string[] = [];
  let now = 0;
  let charged = 0;
  const dota = new OpenDota(
    "private",
    async (url) => {
      urls.push(url);
      return Response.json({
        patch_number: "7.41",
        patch_timestamp: 1774335600,
        general_notes: [{ generic: [{ note: "<b>Global</b> change" }] }],
        heroes: [
          {
            hero_id: 1,
            hero_notes: [{ note: "Base armor changed" }],
            abilities: [
              {
                ability_id: 5000,
                ability_notes: [
                  { note: "Mana cost reduced", info: "<br>At all levels" },
                ],
              },
            ],
          },
          { hero_id: 2, hero_notes: [{ note: "Other hero" }] },
        ],
      });
    },
    () => now,
    async () => {
      charged++;
    },
  );
  const patch = await dota.patchChanges("7.41", [1]);
  expect(patch.data?.heroChanges).toHaveLength(1);
  expect(patch.data?.heroChanges[0]?.notes[1]).toEqual({
    kind: "ability",
    abilityId: 5000,
    text: "Mana cost reduced  At all levels",
  });
  expect(patch.data?.releasedAt).toBe(new Date(1774335600000).toISOString());
  expect(new URL(urls[0]!).hostname).toBe("www.dota2.com");
  expect(new URL(urls[0]!).searchParams.has("api_key")).toBe(false);
  now = 1000;
  const other = await dota.patchChanges("7.41", [2]);
  expect(other.data?.heroChanges[0]?.heroId).toBe(2);
  expect(other.fetchedAt).toBe(patch.fetchedAt);
  expect(charged).toBe(1);
  now = 86_400_001;
  await dota.patchChanges("7.41", [1]);
  expect(charged).toBe(2);
  await expect(dota.patchChanges("../secrets")).rejects.toThrow();
});
