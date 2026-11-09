import { expect, it } from "vitest";
import { LocalGameState, parseGameState } from "./game-state";
it("extracts only exposed hero draft data, strips player identities and excludes the selected own hero", () => {
  const state = parseGameState({
    map: { matchid: "123" },
    player: { team_name: "radiant", steamid: "PRIVATE", name: "PRIVATE" },
    hero: { id: 5 },
    draft: {
      team2: { pick0_id: 5, pick1_class: "npc_dota_hero_axe" },
      team3: { pick0_id: 1, ban0_id: 2 },
    },
  });
  expect(state).toMatchObject({
    matchId: "123",
    team: "radiant",
    ownHeroId: 5,
    allies: [2],
    enemies: [1],
    bans: [],
  });
  // The conflicting ban is excluded; it cannot masquerade as an available draft.
  expect(state.partial).toBe(true);
  expect(JSON.stringify(state)).not.toMatch(/PRIVATE|steamid|name/);
});
it("keeps missing/ambiguous game payloads partial instead of fabricating a draft", () => {
  expect(parseGameState({ draft: {} })).toMatchObject({
    team: null,
    allies: [],
    enemies: [],
    bans: [],
    partial: true,
  });
  expect(
    parseGameState({
      player: { team_name: "dire" },
      draft: { team2: { pick0_id: 99999 }, team3: { pick0_id: 5 } },
    }),
  ).toMatchObject({ allies: [5], enemies: [], partial: true });
});
it("requires a per-user expiring token, isolates status and marks old data stale", () => {
  let now = 0;
  const service = new LocalGameState(3001, () => now);
  const setup = service.setup("one");
  const token = setup.configuration.match(/"token" "([^"]+)"/)![1];
  expect(service.status("two").configured).toBe(false);
  expect(() =>
    service.ingest({ auth: { token: "wrong" }, draft: {} }),
  ).toThrow();
  service.ingest({
    auth: { token },
    map: { matchid: "123" },
    player: { team_name: "radiant" },
    draft: { team2: { pick0_id: 2 }, team3: { pick0_id: 1 } },
  });
  expect(service.status("one")).toMatchObject({
    configured: true,
    stale: false,
    allies: [2],
    enemies: [1],
  });
  now = 16000;
  expect(service.status("one").stale).toBe(true);
  now = 4 * 3600000;
  expect(() => service.ingest({ auth: { token }, draft: {} })).toThrow();
  expect(service.status("one").configured).toBe(false);
});
it("marks the team ambiguous when the own hero appears among enemy picks, blocking draft import", () => {
  const state = parseGameState({
    player: { team_name: "radiant" },
    hero: { id: 5 },
    draft: {
      team2: {
        pick0_id: 1,
        pick1_id: 2,
        pick2_id: 3,
        pick3_id: 4,
        pick4_id: 6,
      },
      team3: {
        pick0_id: 5,
        pick1_id: 7,
        pick2_id: 8,
        pick3_id: 9,
        pick4_id: 10,
      },
    },
  });
  expect(state).toMatchObject({
    team: null,
    ownHeroId: 5,
    allies: [],
    enemies: [],
    partial: true,
  });
});
