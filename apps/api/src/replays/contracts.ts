import { z } from "@hono/zod-openapi";
export const replayMaxBytes = 256 * 1024 * 1024;
export const replayChunkBytes = 4 * 1024 * 1024;
export const importInput = z
  .object({
    filename: z
      .string()
      .min(1)
      .max(180)
      .regex(/\.dem$/i),
    size: z.number().int().min(16).max(replayMaxBytes),
  })
  .strict()
  .openapi("ReplayImportInput");
export const importState = z
  .object({
    id: z.string(),
    status: z.enum(["uploading", "processing", "complete", "failed"]),
    uploadedBytes: z.number(),
    totalBytes: z.number(),
    expiresAt: z.string(),
    matchId: z.string().nullable(),
    error: z.string().nullable(),
  })
  .openapi("ReplayImportState");
export const importCapabilities = z
  .object({
    enabled: z.boolean(),
    maxBytes: z.number(),
    chunkBytes: z.number(),
    retentionLimit: z.number(),
    dailyLimit: z.number(),
    activeImport: z.object(importState.shape).nullable(),
  })
  .openapi("ReplayImportCapabilities");
