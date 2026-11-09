import type { Section } from "../intelligence/contracts";
type Matchup = {
  heroId: number;
  gamesPlayed: number;
  wins: number;
  winRate: number | null;
};
export interface DraftEvidenceSource {
  heroMatchups(id: number): Promise<Section<Matchup[]>>;
}
export type DraftEvidence = {
  requestedEnemies: number;
  loadedEnemies: number;
  sources: {
    enemyId: number;
    fetchedAt: string | null;
    expiresAt: string | null;
    sourceUrl: string;
  }[];
  matchups: {
    candidateId: number;
    enemyId: number;
    games: number;
    candidateWins: number;
    observedWinRate: number;
  }[];
};
export async function loadDraftEvidence(
  source: DraftEvidenceSource,
  enemies: number[],
  candidates: number[],
): Promise<DraftEvidence> {
  const result: DraftEvidence = {
    requestedEnemies: enemies.length,
    loadedEnemies: 0,
    sources: [],
    matchups: [],
  };
  const sections = await Promise.allSettled(
    enemies.slice(0, 3).map((id) => source.heroMatchups(id)),
  );
  for (const [index, entry] of sections.entries()) {
    if (
      entry.status !== "fulfilled" ||
      entry.value.status !== "available" ||
      !entry.value.data
    )
      continue;
    const section = entry.value,
      enemyId = enemies[index];
    result.loadedEnemies++;
    result.sources.push({
      enemyId,
      fetchedAt: section.fetchedAt,
      expiresAt: section.expiresAt,
      sourceUrl: section.sourceUrl,
    });
    const seen = new Set<number>();
    for (const row of section.data ?? [])
      if (candidates.includes(row.heroId) && row.gamesPlayed > 0) {
        if (seen.has(row.heroId)) continue;
        seen.add(row.heroId);
        const wins = row.gamesPlayed - row.wins;
        result.matchups.push({
          candidateId: row.heroId,
          enemyId,
          games: row.gamesPlayed,
          candidateWins: wins,
          observedWinRate: wins / row.gamesPlayed,
        });
      }
  }
  return result;
}
