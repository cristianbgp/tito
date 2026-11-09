import { z } from "@hono/zod-openapi";
export const heroRoles = [
  "Carry",
  "Escape",
  "Nuker",
  "Initiator",
  "Durable",
  "Disabler",
  "Jungler",
  "Support",
  "Pusher",
] as const;
export const heroSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().max(100),
    image: z.url().nullable(),
    roles: z.array(z.enum(heroRoles)).max(9),
    attackType: z.enum(["Melee", "Ranged"]).nullable(),
    attribute: z.enum(["str", "agi", "int", "all"]).nullable(),
  })
  .openapi("DraftHero");
const ids = (max: number) =>
  z.array(z.number().int().min(1).max(10000)).max(max);
export const draftInputSchema = z
  .object({
    role: z.enum(["1", "2", "3", "4", "5"]),
    allies: ids(4),
    enemies: ids(5),
    bans: ids(30),
    pool: ids(30),
    useHistory: z.boolean().default(true),
    useEvidence: z.boolean().optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    for (const group of ["allies", "enemies", "bans", "pool"] as const)
      if (new Set(d[group]).size !== d[group].length)
        ctx.addIssue({
          code: "custom",
          path: [group],
          message: "A hero can only appear once in each group.",
        });
    const unavailable = [...d.allies, ...d.enemies, ...d.bans];
    if (new Set(unavailable).size !== unavailable.length)
      ctx.addIssue({
        code: "custom",
        message:
          "A hero cannot be both picked and banned or appear on both teams.",
      });
  })
  .openapi("HeroDraftInput");
export const reasonCodes = [
  "role_fit",
  "team_balance",
  "matchup_fit",
  "comfort",
  "flexible",
  "uncertain",
] as const;
export const tradeoffCodes = [
  "farm_demand",
  "execution",
  "draft_overlap",
  "matchup_risk",
  "limited_information",
  "none_clear",
] as const;
export const recommendationSchema = z.object({
  favorite: z.boolean().optional(),
  hero: heroSchema,
  fit: z.number().min(0).max(4),
  confidence: z.number().min(0).max(1),
  reason: z.enum(reasonCodes),
  tradeoff: z.enum(tradeoffCodes),
  savedGames: z.number().int().nonnegative(),
});
export const draftResultSchema = z
  .object({
    fingerprint: z.string(),
    generatedAt: z.string(),
    expiresAt: z.string(),
    model: z.literal("gpt-6-luna"),
    promptVersion: z.string(),
    input: draftInputSchema,
    personalized: z.boolean(),
    historyGames: z.number().int().nonnegative(),
    evaluatedHeroes: z.number().int().min(1).max(20),
    evidence: z
      .object({
        requestedEnemies: z.number().int().nonnegative(),
        loadedEnemies: z.number().int().nonnegative(),
        matchups: z.number().int().nonnegative(),
        sources: z.array(
          z.object({
            enemyId: z.number().int(),
            fetchedAt: z.string().nullable(),
            expiresAt: z.string().nullable(),
            sourceUrl: z.string(),
          }),
        ),
      })
      .optional(),
    recommendations: z.array(recommendationSchema).min(1).max(3),
    favoriteRecommendations: z.array(recommendationSchema).max(2).optional(),
  })
  .openapi("HeroDraftResult");
export const draftCatalogSchema = z
  .object({
    heroes: z.array(heroSchema),
    retrievedAt: z.string(),
    source: z.literal("bundled"),
    enabled: z.boolean(),
  })
  .openapi("HeroDraftCatalog");
export type DraftInput = z.infer<typeof draftInputSchema>;
export type DraftHero = z.infer<typeof heroSchema>;
export type DraftResult = z.infer<typeof draftResultSchema>;
export class DraftError extends Error {
  constructor(
    message: string,
    public status: 400 | 409 | 429 | 502 | 503 | 504,
    public retryAfter = 0,
  ) {
    super(message);
  }
}
