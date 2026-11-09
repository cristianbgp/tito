import { z } from "@hono/zod-openapi";

export const metricSchema = z.enum([
  "result",
  "duration",
  "kills",
  "deaths",
  "assists",
  "goldPerMinute",
  "experiencePerMinute",
  "lastHits",
  "denies",
  "level",
  "netWorth",
  "heroDamage",
  "heroHealing",
  "towerDamage",
  "teamGoldAdvantage",
  "teamExperienceAdvantage",
]);
export const factSchema = z
  .object({
    id: z.string().max(100),
    metric: metricSchema,
    value: z.number(),
    samples: z.number().int().min(1).max(20),
    source: z.enum(["match", "baseline"]),
    atSeconds: z.number().nullable(),
  })
  .strict();
export const contextSchema = z
  .object({
    hero: z.string().max(100),
    coverage: z.enum(["summary", "details", "timeline"]),
    comparableGames: z.number().int().min(0).max(20),
    facts: z.array(factSchema).max(70),
  })
  .strict();
const title = z.string().trim().min(1).max(100);
const text = z.string().trim().min(1).max(500);
const evidenceIds = z.array(z.string().max(100)).min(1).max(5);
const findingSchema = z
  .object({
    title,
    interpretation: text,
    evidenceIds,
    certainty: z.enum(["observed", "to_review"]),
  })
  .strict();
export const reviewOutputSchema = z
  .object({
    summary: z.string().trim().min(1).max(600),
    wentWell: z.array(findingSchema).max(3),
    wentWrong: z.array(findingSchema).max(3),
    improve: z
      .array(z.object({ title, action: text, evidenceIds }).strict())
      .min(1)
      .max(3),
  })
  .strict();
export const savedReviewSchema = z
  .object({
    matchId: z.string(),
    generatedAt: z.string(),
    locale: z.enum(["en", "es"]).optional(),
    model: z.string(),
    promptVersion: z.string(),
    context: contextSchema,
    content: reviewOutputSchema,
  })
  .strict()
  .openapi("SavedMatchReview");
export const reviewStateSchema = z
  .object({
    enabled: z.boolean(),
    review: savedReviewSchema.nullable(),
  })
  .openapi("MatchReviewState");
export type ReviewContext = z.infer<typeof contextSchema>;
export type ReviewOutput = z.infer<typeof reviewOutputSchema>;
export type SavedReview = z.infer<typeof savedReviewSchema>;
export class ReviewError extends Error {
  constructor(
    message: string,
    public status: 400 | 403 | 409 | 429 | 502 | 503 | 504,
    public retryAfter = 0,
  ) {
    super(message);
  }
}
