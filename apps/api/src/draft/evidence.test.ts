import { expect, it, vi } from "vitest";
import { loadDraftEvidence } from "./evidence";
it("bounds enemy lookups, reverses enemy perspective and preserves missing/zero samples", async () => {
  const source = {
    heroMatchups: vi.fn(async (id: number) =>
      id === 1
        ? {
            status: "available" as const,
            data: [
              { heroId: 5, gamesPlayed: 100, wins: 70, winRate: 0.7 },
              { heroId: 20, gamesPlayed: 0, wins: 0, winRate: null },
            ],
            fetchedAt: "2026-11-07T00:00:00Z",
            expiresAt: "2026-11-07T01:00:00Z",
            sourceUrl: "https://www.opendota.com/heroes/1/matchups",
          }
        : Promise.reject(new Error("offline")),
    ),
  };
  const evidence = await loadDraftEvidence(source, [1, 2, 3, 4, 5], [5, 20]);
  expect(source.heroMatchups).toHaveBeenCalledTimes(3);
  expect(evidence.requestedEnemies).toBe(5);
  expect(evidence.loadedEnemies).toBe(1);
  expect(evidence.matchups).toEqual([
    {
      candidateId: 5,
      enemyId: 1,
      games: 100,
      candidateWins: 30,
      observedWinRate: 0.3,
    },
  ]);
  expect(evidence.sources).toHaveLength(1);
  expect(JSON.stringify(evidence)).not.toContain("api_key");
});
