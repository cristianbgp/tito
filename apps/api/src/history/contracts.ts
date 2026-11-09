import { z } from "@hono/zod-openapi";
import { recentMatchSchema } from "../dota/schemas";

export const historySchema = z
  .object({
    accountId: z.string(),
    matches: z.array(recentMatchSchema),
    total: z.number().int().nonnegative(),
    lastSyncedAt: z.string().nullable(),
    nextSyncAt: z.string().nullable(),
    hasOlder: z.boolean(),
    retentionLimit: z.number().int(),
    importSize: z.number().int(),
  })
  .openapi("SavedHistory");
export const historySyncSchema = z
  .object({ mode: z.enum(["latest", "older"]) })
  .strict()
  .openapi("SyncHistory");
export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});
export type SavedHistory = z.infer<typeof historySchema>;
export type SyncMode = z.infer<typeof historySyncSchema>["mode"];

const metricSchema = z.object({
  value: z.number().nullable(),
  samples: z.number().int().nonnegative(),
});
const progressStatsSchema = z.object({
  games: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  unknown: z.number().int().nonnegative(),
  winRate: metricSchema,
  deaths: metricSchema,
  goldPerMinute: metricSchema,
  experiencePerMinute: metricSchema,
});
const progressPeriodSchema = z.object({
  from: z.string(),
  to: z.string(),
  stats: progressStatsSchema,
});
export const progressSchema = z
  .object({
    accountId: z.string(),
    retainedMatches: z.number().int().nonnegative(),
    retentionLimit: z.number().int(),
    lastSyncedAt: z.string().nullable(),
    asOf: z.string(),
    timeZone: z.literal("UTC"),
    minimumSamples: z.number().int(),
    current: progressPeriodSchema,
    previous: progressPeriodSchema,
    weeks: z.array(progressPeriodSchema.extend({ partial: z.boolean() })),
    changes: z.object({
      winRatePoints: z.number().nullable(),
      deaths: z.number().nullable(),
      goldPerMinute: z.number().nullable(),
      experiencePerMinute: z.number().nullable(),
    }),
  })
  .openapi("PlayerProgress");
export type PlayerProgress = z.infer<typeof progressSchema>;

export class HistoryError extends Error {
  constructor(
    message: string,
    public status: 409 | 429,
    public retryAfter = 0,
  ) {
    super(message);
  }
}
