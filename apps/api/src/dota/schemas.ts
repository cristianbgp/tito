import { z } from "@hono/zod-openapi";

export const errorSchema = z.object({ error: z.string() }).openapi("ApiError");
export const recentMatchSchema = z
  .object({
    id: z.string(),
    accountId: z.string(),
    heroId: z.number(),
    hero: z.string(),
    heroImage: z.string().nullable(),
    result: z.enum(["win", "loss"]).nullable(),
    startedAt: z.number(),
    duration: z.number(),
    kills: z.number().nullable(),
    deaths: z.number().nullable(),
    assists: z.number().nullable(),
    goldPerMinute: z.number().nullable(),
    experiencePerMinute: z.number().nullable(),
    gameMode: z.number().int().nullable().optional(),
    lobbyType: z.number().int().nullable().optional(),
    patch: z.number().int().nullable().optional(),
    actualRole: z.string().nullable().optional(),
  })
  .openapi("RecentMatch");
export const itemSlotSchema = z
  .object({
    id: z.number().int().nullable(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  })
  .openapi("ItemSlot");
export const purchaseEventSchema = z
  .object({
    time: z.number(),
    key: z.string(),
    itemId: z.number().int().nullable(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  })
  .openapi("PurchaseEvent");
export const minuteSampleSchema = z
  .object({
    time: z.number().nonnegative(),
    gold: z.number().nullable(),
    experience: z.number().nullable(),
    lastHits: z.number().nullable(),
  })
  .openapi("MinuteSample");
export const killEventSchema = z
  .object({ time: z.number(), target: z.string() })
  .openapi("KillEvent");
export const objectiveSchema = z
  .object({
    time: z.number(),
    type: z.string(),
    playerSlot: z.number().int().nullable(),
    target: z.string().nullable(),
  })
  .openapi("MatchObjective");
export const teamfightSchema = z
  .object({
    time: z.number(),
    endTime: z.number().nullable(),
    deaths: z.number().nullable(),
  })
  .openapi("MatchTeamfight");
export const matchPlayerSchema = z
  .object({
    heroId: z.number(),
    hero: z.string(),
    heroImage: z.string().nullable(),
    slot: z.number().int(),
    accountId: z.string().nullable(),
    name: z.string().nullable(),
    team: z.enum(["radiant", "dire"]),
    kills: z.number().nullable(),
    deaths: z.number().nullable(),
    assists: z.number().nullable(),
    goldPerMinute: z.number().nullable(),
    experiencePerMinute: z.number().nullable(),
    lastHits: z.number().nullable(),
    denies: z.number().nullable(),
    level: z.number().nullable(),
    netWorth: z.number().nullable(),
    heroDamage: z.number().nullable(),
    heroHealing: z.number().nullable(),
    towerDamage: z.number().nullable(),
    inventory: z.array(itemSlotSchema),
    backpack: z.array(itemSlotSchema),
    neutralItem: itemSlotSchema,
    neutralEnhancement: itemSlotSchema,
    actualRole: z.string().nullable().optional(),
    purchases: z.array(purchaseEventSchema).max(100).nullable().optional(),
    minuteSamples: z.array(minuteSampleSchema).max(121).nullable().optional(),
    killEvents: z.array(killEventSchema).max(100).nullable().optional(),
  })
  .openapi("MatchPlayer");
export const advantagePointSchema = z
  .object({
    time: z.number(),
    value: z.number().nullable(),
  })
  .openapi("AdvantagePoint");
export const matchDetailSchema = z
  .object({
    id: z.string(),
    startedAt: z.number(),
    duration: z.number(),
    winner: z.enum(["radiant", "dire"]).nullable(),
    parsed: z.boolean(),
    gameMode: z.number().int().nullable(),
    lobbyType: z.number().int().nullable(),
    patch: z.number().int().nullable().optional(),
    objectives: z.array(objectiveSchema).max(100).nullable().optional(),
    teamfights: z.array(teamfightSchema).max(50).nullable().optional(),
    region: z.string().nullable(),
    radiantScore: z.number().nullable(),
    direScore: z.number().nullable(),
    metadataAvailable: z.boolean(),
    goldAdvantage: z.array(advantagePointSchema),
    experienceAdvantage: z.array(advantagePointSchema),
    players: z.array(matchPlayerSchema),
  })
  .openapi("MatchDetail");

export const parseRequestSchema = z
  .object({ jobId: z.string() })
  .openapi("ParseRequest");
export const parseStatusSchema = z
  .object({
    status: z.enum(["queued", "complete", "unavailable"]),
    match: matchDetailSchema.optional(),
  })
  .openapi("ParseStatus");
