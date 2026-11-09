import type { z } from "zod";
import { matchDetailSchema, recentMatchSchema } from "../dota/schemas";
export const summary = (
  fields: Partial<z.infer<typeof recentMatchSchema>> = {},
) =>
  recentMatchSchema.parse({
    id: "900",
    accountId: "42",
    heroId: 1,
    hero: "Anti-Mage",
    heroImage: null,
    startedAt: 1700000000,
    duration: 1800,
    result: "loss",
    kills: 4,
    deaths: 0,
    assists: 8,
    goldPerMinute: 500,
    experiencePerMinute: null,
    ...fields,
  });
export const detail = () =>
  matchDetailSchema.parse({
    id: "900",
    startedAt: 1700000000,
    duration: 1800,
    winner: "radiant",
    parsed: true,
    gameMode: 22,
    lobbyType: 7,
    region: null,
    radiantScore: 30,
    direScore: 20,
    metadataAvailable: true,
    goldAdvantage: [
      { time: 600, value: 2000 },
      { time: 1199, value: 3000 },
    ],
    experienceAdvantage: [],
    players: [
      {
        ...summary(),
        slot: 128,
        name: "PRIVATE NAME",
        team: "dire",
        lastHits: 0,
        denies: null,
        level: 20,
        netWorth: 18000,
        heroDamage: 22000,
        heroHealing: null,
        towerDamage: 1200,
        inventory: [],
        backpack: [],
        neutralItem: { id: null, name: null, image: null },
        neutralEnhancement: { id: null, name: null, image: null },
      },
    ],
  });
export const validReview = () => ({
  summary: "A steady economy, with decisions worth checking in the replay.",
  wentWell: [
    {
      title: "Economy",
      interpretation: "You earned 500 gold per minute.",
      evidenceIds: ["match.goldPerMinute"],
      certainty: "observed" as const,
    },
  ],
  wentWrong: [],
  improve: [
    {
      title: "Review your conversion",
      action:
        "Check whether your farm led to a safe objective opportunity after your item timings.",
      evidenceIds: ["match.goldPerMinute"],
    },
  ],
});
