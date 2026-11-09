import { z } from "@hono/zod-openapi";
import { draftInputSchema, heroSchema } from "../draft/contracts";
import { heroCatalog } from "../draft/catalog";

export const roleSchema = z.enum(["1", "2", "3", "4", "5"]);
export const matchIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .refine((id) => BigInt(id) <= 9223372036854775807n, "Invalid match ID");
const knownHero = z
  .number()
  .int()
  .positive()
  .refine((id) => heroCatalog.some((hero) => hero.id === id), "Unknown hero");
export const poolEntrySchema = z
  .object({
    heroId: knownHero,
    preference: z.enum(["favorite", "comfortable", "learning", "avoid"]),
  })
  .strict();
export const poolInputSchema = z
  .object({ entries: z.array(poolEntrySchema).max(30) })
  .strict()
  .refine(
    (value) =>
      new Set(value.entries.map((e) => e.heroId)).size === value.entries.length,
    "Duplicate hero",
  );
export const poolSchema = z
  .object({
    role: roleSchema,
    entries: z.array(poolEntrySchema).max(30),
    updatedAt: z.string().nullable(),
  })
  .openapi("SavedHeroPool");
export const noteInputSchema = z
  .object({
    text: z.string().trim().max(4000),
    tags: z
      .array(z.string().trim().min(1).max(40))
      .max(8)
      .refine((tags) => new Set(tags).size === tags.length, "Duplicate tag"),
    actualRole: roleSchema.nullable().default(null),
    bookmarkSeconds: z
      .number()
      .int()
      .min(0)
      .max(86400)
      .nullable()
      .default(null),
  })
  .strict();
export const feedbackInputSchema = z
  .object({
    rating: z.enum(["useful", "unclear", "incorrect"]),
    comment: z.string().trim().max(500).default(""),
  })
  .strict();
export const feedbackSchema = feedbackInputSchema.extend({
  updatedAt: z.string(),
});
export const noteSchema = noteInputSchema
  .extend({ matchId: matchIdSchema, updatedAt: z.string() })
  .openapi("SavedMatchNote");
export const draftSnapshotInputSchema = z
  .object({
    input: draftInputSchema,
    chosenHeroId: knownHero.nullable().default(null),
    matchId: matchIdSchema.nullable().default(null),
  })
  .strict()
  .superRefine((value, ctx) => {
    const d = value.input;
    if (
      [...d.allies, ...d.enemies, ...d.bans, ...d.pool].some(
        (id) => !heroCatalog.some((h) => h.id === id),
      )
    )
      ctx.addIssue({ code: "custom", message: "Unknown hero in draft" });
    if (
      value.chosenHeroId !== null &&
      ([...d.allies, ...d.enemies, ...d.bans].includes(value.chosenHeroId) ||
        (d.pool.length > 0 && !d.pool.includes(value.chosenHeroId)))
    )
      ctx.addIssue({
        code: "custom",
        path: ["chosenHeroId"],
        message: "Chosen hero is unavailable in this draft",
      });
  });
export const draftUpdateSchema = z
  .object({
    chosenHeroId: knownHero.nullable().optional(),
    matchId: matchIdSchema.nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Provide a choice or match");
export const draftSnapshotSchema = z
  .object({
    id: z.string().uuid(),
    input: draftInputSchema,
    chosenHeroId: knownHero.nullable(),
    matchId: matchIdSchema.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("SavedDraftSnapshot");
export const heroSummarySchema = z
  .object({
    hero: heroSchema,
    games: z.number().int(),
    knownResults: z.number().int(),
    wins: z.number().int(),
    winRate: z.number().nullable(),
    kills: z.number().nullable(),
    deaths: z.number().nullable(),
    assists: z.number().nullable(),
    goldPerMinute: z.number().nullable(),
    experiencePerMinute: z.number().nullable(),
    reviewedGames: z.number().int(),
    notedGames: z.number().int(),
  })
  .openapi("PersonalHeroSummary");
export const heroDetailSchema = heroSummarySchema
  .extend({
    matches: z.array(
      z.object({
        matchId: matchIdSchema,
        startedAt: z.number(),
        result: z.enum(["win", "loss"]).nullable(),
        note: noteSchema.nullable(),
        reviewExcerpt: z.string().nullable(),
      }),
    ),
    coverage: z.literal("retained_summaries"),
    caution: z.string(),
  })
  .openapi("PersonalHeroDetail");
const usageCounterSchema = z.object({
  attempts: z.number().int(),
  allowance: z.number().int(),
  remaining: z.number().int(),
  estimatedCostUsd: z.number(),
});
export const usageSchema = z
  .object({
    day: z.string(),
    resetsAt: z.string(),
    enabled: z.boolean(),
    reviews: usageCounterSchema,
    drafts: usageCounterSchema,
    coaching: usageCounterSchema,
    costBasis: z.literal("settled_or_reserved_estimate"),
  })
  .openapi("PersonalAiUsage");
export const reflectionSchema = z
  .object({
    mode: z.enum(["latest", "day"]),
    day: z.string().nullable(),
    matchIds: z.array(matchIdSchema),
    games: z.number().int(),
    knownResults: z.number().int(),
    wins: z.number().int(),
    losses: z.number().int(),
    durationSeconds: z.number(),
    kills: z.number().nullable(),
    deaths: z.number().nullable(),
    assists: z.number().nullable(),
    reviewedGames: z.number().int(),
    notedGames: z.number().int(),
    summary: z.string(),
    coverage: z.literal("retained_summaries"),
  })
  .openapi("SessionReflection");
export const reflectionQuerySchema = z
  .object({
    mode: z.enum(["latest", "day"]).default("latest"),
    day: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.mode === "day" &&
      (!value.day ||
        Number.isNaN(Date.parse(`${value.day}T00:00:00Z`)) ||
        new Date(`${value.day}T00:00:00Z`).toISOString().slice(0, 10) !==
          value.day)
    )
      ctx.addIssue({
        code: "custom",
        path: ["day"],
        message: "Choose a valid UTC day",
      });
  });
export type PoolEntry = z.infer<typeof poolEntrySchema>;
export type MatchNote = z.infer<typeof noteInputSchema>;
export type ReviewFeedback = z.infer<typeof feedbackInputSchema>;
export type DraftSnapshotInput = z.infer<typeof draftSnapshotInputSchema>;
export class LibraryError extends Error {
  constructor(
    message: string,
    public status: 400 | 401 | 403 | 404 | 409 | 503,
  ) {
    super(message);
  }
}
