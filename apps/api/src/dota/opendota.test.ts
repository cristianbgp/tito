import { describe, expect, it, vi } from "vitest";
import { OpenDota, parseAccountId } from "./opendota";

describe("Dota account identifiers", () => {
  it("accepts friend IDs and converts a SteamID64 without precision loss", () => {
    expect(parseAccountId("70388657")).toBe("70388657");
    expect(parseAccountId("76561198030654385")).toBe("70388657");
  });
  it.each([
    "0",
    "-1",
    "1.5",
    "abc",
    "4294967295",
    "76561197960265728",
    "9007199254740999999999",
  ])("rejects invalid or anonymous ID %s", (id) => {
    expect(() => parseAccountId(id)).toThrow();
  });
});

const heroes = {
  "1": {
    id: 1,
    localized_name: "Anti-Mage",
    img: "/apps/dota2/images/dota_react/heroes/antimage.png",
  },
};
const fixture = {
  match_id: 123456789,
  hero_id: 1,
  player_slot: 128,
  radiant_win: false,
  start_time: 1700000000,
  duration: 2400,
  kills: 8,
  deaths: 3,
  assists: 12,
};

describe("OpenDota boundary", () => {
  it("requests every required summary field when OpenDota projects only selected columns", async () => {
    const complete = {
      ...fixture,
      gold_per_min: 0,
      xp_per_min: 500,
      game_mode: 22,
      lobby_type: 7,
      patch: 154,
    };
    const dota = new OpenDota(undefined, async (value) => {
      const url = new URL(value);
      if (url.pathname.endsWith("/heroes")) return Response.json(heroes);
      const columns = new Set(url.searchParams.getAll("project"));
      return Response.json([
        Object.fromEntries(
          Object.entries(complete).filter(([key]) => columns.has(key)),
        ),
      ]);
    });
    const [row] = await dota.historyMatches("70388657", 0);
    expect(row).toMatchObject({
      id: String(fixture.match_id),
      heroId: 1,
      startedAt: fixture.start_time,
      duration: fixture.duration,
      result: "win",
      kills: 8,
      deaths: 3,
      assists: 12,
      goldPerMinute: 0,
      experiencePerMinute: 500,
      gameMode: 22,
      lobbyType: 7,
      patch: 154,
    });
  });
  it("uses bounded projected history pages instead of fetching entire player archives", async () => {
    const urls: URL[] = [];
    const dota = new OpenDota(undefined, async (value) => {
      const url = new URL(value);
      urls.push(url);
      return Response.json(
        url.pathname.endsWith("/heroes") ? heroes : [fixture],
      );
    });
    const rows = await dota.historyMatches("76561198030654385", 90);
    expect(rows[0]).toMatchObject({
      accountId: "70388657",
      hero: "Anti-Mage",
      result: "win",
    });
    const url = urls.find((u) => u.pathname.endsWith("/matches"))!;
    expect(url.pathname).toBe("/api/players/70388657/matches");
    expect(url.searchParams.get("limit")).toBe("100");
    expect(url.searchParams.get("offset")).toBe("90");
    expect(url.searchParams.get("sort")).toBe("match_id");
    expect(url.searchParams.getAll("project")).toEqual(
      expect.arrayContaining(["gold_per_min", "xp_per_min"]),
    );
    await expect(dota.historyMatches("70388657", -1)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("shares identical concurrent GETs and charges the budget only on real requests", async () => {
    const budget = vi.fn(async () => {});
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const dota = new OpenDota(
      undefined,
      async (url) => {
        await pending;
        return Response.json(url.endsWith("/heroes") ? heroes : [fixture]);
      },
      Date.now,
      budget,
    );
    const first = dota.recentMatches("70388657");
    const second = dota.recentMatches("70388657");
    release();
    await Promise.all([first, second]);
    await dota.recentMatches("70388657");
    expect(budget).toHaveBeenCalledTimes(1);
  });

  it("does not retain oversized catalog responses in the temporary cache", async () => {
    let catalogs = 0;
    const dota = new OpenDota(undefined, async (url) => {
      if (url.endsWith("/heroes")) {
        catalogs++;
        return Response.json({
          "1": { ...heroes["1"], localized_name: "x".repeat(2_200_000) },
        });
      }
      return Response.json([fixture]);
    });
    await dota.heroEvidence(1);
    await dota.heroEvidence(1);
    expect(catalogs).toBe(2);
  });
  it("uses the player's team to determine results and preserves absent statistics", async () => {
    const dota = new OpenDota(undefined, async (url) =>
      Response.json(url.endsWith("/heroes") ? heroes : [fixture]),
    );
    const matches = await dota.recentMatches("70388657");
    expect(matches[0]).toMatchObject({
      id: "123456789",
      accountId: "70388657",
      hero: "Anti-Mage",
      result: "win",
      kills: 8,
      goldPerMinute: null,
    });
  });

  it("does not invent a result when the winner is unavailable", async () => {
    const dota = new OpenDota(undefined, async (url) =>
      Response.json(
        url.endsWith("/heroes") ? heroes : [{ ...fixture, radiant_win: null }],
      ),
    );
    expect((await dota.recentMatches("70388657"))[0].result).toBeNull();
  });

  it("reuses fresh results and refetches expired data", async () => {
    let calls = 0;
    let time = 0;
    const dota = new OpenDota(
      undefined,
      async (url) => {
        calls++;
        return Response.json(url.endsWith("/heroes") ? heroes : [fixture]);
      },
      () => time,
    );
    await dota.recentMatches("70388657");
    await dota.recentMatches("70388657");
    expect(calls).toBe(1);
    time = 61_000;
    await dota.recentMatches("70388657");
    expect(calls).toBe(2);
  });

  it.each([404, 429, 503])(
    "reports upstream HTTP %s without returning fabricated matches",
    async (status) => {
      const dota = new OpenDota(
        undefined,
        async () => new Response("upstream", { status }),
      );
      await expect(dota.recentMatches("70388657")).rejects.toMatchObject({
        status: status === 503 ? 502 : status,
      });
    },
  );

  it("rejects a malformed upstream payload", async () => {
    const dota = new OpenDota(undefined, async (url) =>
      Response.json(
        url.endsWith("/heroes") ? heroes : [{ duration: "invalid" }],
      ),
    );
    await expect(dota.recentMatches("70388657")).rejects.toMatchObject({
      status: 502,
    });
  });

  it("rejects a timestamp that would crash browser date formatting", async () => {
    const dota = new OpenDota(undefined, async (url) =>
      Response.json(
        url.endsWith("/heroes")
          ? heroes
          : [{ ...fixture, start_time: 9000000000000 }],
      ),
    );
    await expect(dota.recentMatches("70388657")).rejects.toMatchObject({
      status: 502,
    });
  });

  it("reports a timeout while reading the upstream body as a timeout", async () => {
    const dota = new OpenDota(undefined, async (url) => {
      if (url.endsWith("/heroes")) return Response.json(heroes);
      return {
        ok: true,
        json: async () => {
          throw new DOMException("The operation timed out", "TimeoutError");
        },
      } as unknown as Response;
    });
    await expect(dota.recentMatches("70388657")).rejects.toMatchObject({
      status: 504,
    });
  });

  it("labels unparsed match details and missing per-player stats", async () => {
    const dota = new OpenDota(undefined, async (url) =>
      Response.json(
        url.endsWith("/heroes")
          ? heroes
          : {
              match_id: 123456789,
              start_time: 1700000000,
              duration: 2400,
              radiant_win: false,
              version: null,
              players: [
                {
                  hero_id: 1,
                  player_slot: 128,
                  kills: 8,
                  deaths: 3,
                  assists: 12,
                },
              ],
            },
      ),
    );
    const match = await dota.match("123456789");
    expect(match.parsed).toBe(false);
    expect(match.players[0]).toMatchObject({
      hero: "Anti-Mage",
      team: "dire",
      goldPerMinute: null,
    });
  });
});

it("loads summary hero names and images without a network catalog dependency", async () => {
  const paths: string[] = [];
  const dota = new OpenDota(undefined, async (value) => {
    const path = new URL(value).pathname;
    paths.push(path);
    if (path.endsWith("/heroes")) throw new Error("Catalog is unavailable");
    return Response.json([fixture]);
  });
  const [historical] = await dota.historyMatches("70388657", 0);
  const [recent] = await dota.recentMatches("70388657");
  expect(historical).toMatchObject({
    hero: "Anti-Mage",
    heroImage: expect.stringContaining("/heroes/antimage.png"),
  });
  expect(recent.hero).toBe("Anti-Mage");
  expect(paths).toEqual([
    "/api/players/70388657/matches",
    "/api/players/70388657/recentMatches",
  ]);
});

it("bypasses a fresh recent-match read cache for an explicit sync", async () => {
  let kills = 1;
  let requests = 0;
  const dota = new OpenDota(undefined, async () => {
    requests++;
    return Response.json([{ ...fixture, kills }]);
  });
  expect((await dota.recentMatches("70388657"))[0].kills).toBe(1);
  kills = 2;
  expect((await dota.recentMatches("70388657"))[0].kills).toBe(1);
  expect((await dota.recentMatches("70388657", true))[0].kills).toBe(2);
  expect(requests).toBe(2);
});
