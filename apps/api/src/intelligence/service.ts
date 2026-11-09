import type { z } from "zod";
import type { matchDetailSchema } from "../dota/schemas";
import type { matchEvidenceSchema, reviewMomentSchema } from "./contracts";

export function matchEvidence(
  match: z.infer<typeof matchDetailSchema>,
): z.infer<typeof matchEvidenceSchema> {
  const moments: z.infer<typeof reviewMomentSchema>[] = [];
  for (const player of match.players.slice(0, 10)) {
    for (const kill of player.killEvents ?? [])
      moments.push({
        kind: "kill",
        time: kill.time,
        endTime: null,
        actorSlot: player.slot,
        target: kill.target,
        deaths: null,
      });
  }
  for (const objective of match.objectives ?? [])
    moments.push({
      kind: "objective",
      time: objective.time,
      endTime: null,
      actorSlot: objective.playerSlot,
      target: objective.target ?? objective.type,
      deaths: null,
    });
  for (const fight of match.teamfights ?? [])
    moments.push({
      kind: "teamfight",
      time: fight.time,
      endTime: fight.endTime,
      actorSlot: null,
      target: null,
      deaths: fight.deaths,
    });
  return {
    matchId: match.id,
    parsed: match.parsed,
    coverage: {
      purchases: match.players.some((p) => p.purchases != null),
      minuteSamples: match.players.some((p) => p.minuteSamples != null),
      moments:
        match.objectives != null ||
        match.teamfights != null ||
        match.players.some((p) => p.killEvents != null),
    },
    players: match.players.slice(0, 10).map((p) => ({
      slot: p.slot,
      heroId: p.heroId,
      hero: p.hero,
      heroImage: p.heroImage,
      accountId: p.accountId,
      itemTimings: (p.purchases ?? []).slice(0, 100),
      minuteSamples: (p.minuteSamples ?? []).slice(0, 121),
    })),
    moments: moments.sort((a, b) => a.time - b.time).slice(0, 100),
    limitations: [
      "Recorded events are observations, not explanations of why a match was won or lost.",
      "Coverage means a source field was present; replay data may be partial. Item purchases do not establish completed builds.",
      "This view includes at most 100 recorded moments, 100 purchases and 121 minute samples per player.",
    ],
    sourceUrl: `https://www.opendota.com/matches/${match.id}`,
  };
}
