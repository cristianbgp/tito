import { z } from "@hono/zod-openapi";
import { metricSchema } from "../review/contracts";

export const coachingEvidenceSchema = z
  .object({
    id: z.string().max(100),
    metric: metricSchema,
    value: z.number(),
    samples: z.number().int().min(1).max(1000),
    matchIds: z.array(z.string()).max(20),
  })
  .strict();
export const coachingObservationSchema = z
  .object({
    text: z.string().max(500),
    evidenceIds: z.array(z.string()).min(1).max(5),
  })
  .strict();
export const coachingInsightsSchema = z
  .object({
    asOf: z.string(),
    verified: z.boolean(),
    retainedMatches: z.number().int().nonnegative(),
    minimumSamples: z.literal(5),
    timeZone: z.literal("UTC"),
    strengths: z.array(coachingObservationSchema).max(3),
    concerns: z.array(coachingObservationSchema).max(3),
    evidence: z.array(coachingEvidenceSchema).max(20),
    latestDay: z
      .object({
        date: z.string(),
        games: z.number().int(),
        wins: z.number().int(),
        losses: z.number().int(),
        unknown: z.number().int(),
        reflection: z.string().max(500),
      })
      .nullable(),
    limitations: z.array(z.string()).max(5),
  })
  .strict()
  .openapi("CoachingInsights");
export const coachingOutputSchema = z
  .object({
    text: z.string().trim().min(1).max(1600),
    evidenceIds: z.array(z.string().max(100)).max(10),
    needsReplay: z.boolean(),
  })
  .strict();
export const savedCoachingSchema = z
  .object({
    fingerprint: z.string(),
    kind: z.enum(["summary", "follow_up"]),
    matchId: z.string().nullable(),
    generatedAt: z.string(),
    locale: z.enum(["en", "es"]).optional(),
    model: z.string(),
    promptVersion: z.string(),
    question: z.string().max(500).nullable(),
    content: coachingOutputSchema,
    evidence: z.array(coachingEvidenceSchema).max(70),
  })
  .strict()
  .openapi("SavedCoaching");
export const coachingStateSchema = z
  .object({
    enabled: z.boolean(),
    insights: coachingInsightsSchema,
    summary: savedCoachingSchema.nullable(),
  })
  .openapi("CoachingState");
export const followUpStateSchema = z
  .object({
    enabled: z.boolean(),
    answer: savedCoachingSchema.nullable(),
    questions: z.array(z.object({ id: z.string(), label: z.string() })),
    privacyNotice: z.string(),
  })
  .openapi("FollowUpState");
export const cannedQuestions = {
  focus: "What should I focus on next?",
  comparison: "How does this compare with my saved games?",
  replay: "What should I check in the replay?",
} as const;
export const followUpInputSchema = z
  .object({
    question: z.string().trim().min(1).max(500).optional(),
    questionId: z.enum(["focus", "comparison", "replay"]).optional(),
  })
  .strict()
  .refine(
    (v) => Boolean(v.question) !== Boolean(v.questionId),
    "Provide one question or selected questionId.",
  );
export type CoachingInsights = z.infer<typeof coachingInsightsSchema>;
export type CoachingOutput = z.infer<typeof coachingOutputSchema>;
export type SavedCoaching = z.infer<typeof savedCoachingSchema>;
export type FollowUpInput = z.infer<typeof followUpInputSchema>;
export class CoachingError extends Error {
  constructor(
    message: string,
    public status: 400 | 403 | 409 | 429 | 502 | 503 | 504,
    public retryAfter = 0,
  ) {
    super(message);
  }
}
