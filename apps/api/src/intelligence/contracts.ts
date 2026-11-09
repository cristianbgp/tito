import { z } from "@hono/zod-openapi";
import { minuteSampleSchema, purchaseEventSchema } from "../dota/schemas";

export function sectionSchema<T extends z.ZodType>(data: T) {
  return z.object({
    status: z.enum(["available", "empty", "unavailable"]),
    fetchedAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    sourceUrl: z.string(),
    data: data.nullable(),
  });
}
export const heroMetadataSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  image: z.string().nullable(),
  roles: z.array(z.string()),
  attackType: z.string().nullable(),
  primaryAttribute: z.string().nullable(),
});
export const matchupSchema = z.object({
  heroId: z.number().int(),
  gamesPlayed: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(1).nullable(),
});
export const percentileSchema = z.object({
  percentile: z.number().min(0).max(1),
  value: z.number().nonnegative(),
});
export const benchmarkSchema = z.object({
  metric: z.string(),
  percentiles: z.array(percentileSchema).max(20),
});
export const popularitySchema = z.object({
  phase: z.enum(["start", "early", "mid", "late"]),
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        count: z.number().int().nonnegative(),
        name: z.string().nullable().optional(),
        image: z.string().nullable().optional(),
      }),
    )
    .max(30),
});
export const heroEvidenceSchema = z
  .object({
    heroId: z.number().int().positive(),
    catalog: sectionSchema(heroMetadataSchema),
    matchups: sectionSchema(z.array(matchupSchema).max(150)),
    benchmarks: sectionSchema(z.array(benchmarkSchema).max(12)),
    itemPopularity: sectionSchema(z.array(popularitySchema).max(4)),
    referenceCards: z.array(
      z.object({ title: z.string(), body: z.string(), sourceUrl: z.string() }),
    ),
    limitations: z.array(z.string()),
  })
  .openapi("HeroEvidence");
export const reviewMomentSchema = z.object({
  kind: z.enum(["kill", "objective", "teamfight"]),
  time: z.number(),
  endTime: z.number().nullable(),
  actorSlot: z.number().int().nullable(),
  target: z.string().nullable(),
  deaths: z.number().nullable(),
});
export const matchEvidenceSchema = z
  .object({
    matchId: z.string(),
    parsed: z.boolean(),
    coverage: z.object({
      purchases: z.boolean(),
      minuteSamples: z.boolean(),
      moments: z.boolean(),
    }),
    players: z
      .array(
        z.object({
          slot: z.number().int(),
          heroId: z.number().int(),
          hero: z.string().optional(),
          heroImage: z.string().nullable().optional(),
          accountId: z.string().nullable().optional(),
          itemTimings: z.array(purchaseEventSchema).max(100),
          minuteSamples: z.array(minuteSampleSchema).max(121),
        }),
      )
      .max(10),
    moments: z.array(reviewMomentSchema).max(100),
    limitations: z.array(z.string()),
    sourceUrl: z.string(),
  })
  .openapi("MatchEvidence");
export const patchReferenceSchema = sectionSchema(
  z
    .array(
      z.object({
        id: z.number().int().nullable(),
        name: z.string(),
        releasedAt: z.string().nullable(),
        sourceUrl: z.string(),
      }),
    )
    .max(30),
)
  .extend({ limitations: z.array(z.string()) })
  .openapi("PatchReferences");

export type Section<T> = {
  status: "available" | "empty" | "unavailable";
  fetchedAt: string | null;
  expiresAt: string | null;
  sourceUrl: string;
  data: T | null;
};
export const patchChangesSchema = sectionSchema(
  z.object({
    version: z.string(),
    releasedAt: z.string().nullable(),
    sourceUrl: z.string(),
    heroChanges: z
      .array(
        z.object({
          heroId: z.number().int(),
          notes: z
            .array(
              z.object({
                kind: z.enum(["hero", "talent", "ability"]),
                abilityId: z.number().int().nullable(),
                text: z.string(),
              }),
            )
            .max(40),
        }),
      )
      .max(150),
    generalChanges: z.array(z.string()).max(30),
  }),
)
  .extend({ limitations: z.array(z.string()) })
  .openapi("PatchChanges");
