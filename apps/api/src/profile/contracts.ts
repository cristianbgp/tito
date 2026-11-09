import { z } from "@hono/zod-openapi";

export const profileInputSchema = z
  .object({
    accountId: z
      .string()
      .trim()
      .regex(/^[1-9]\d{0,16}$/)
      .nullable(),
    role: z.number().int().min(1).max(5).nullable(),
    experience: z.enum(["beginner", "intermediate", "advanced"]).nullable(),
  })
  .strict()
  .openapi("UpdatePlayerProfile");

export const profileSchema = z
  .object({
    accountId: z.string().nullable(),
    linkedAccountId: z.string().nullable(),
    role: z.number().int().min(1).max(5).nullable(),
    experience: z.enum(["beginner", "intermediate", "advanced"]).nullable(),
  })
  .openapi("PlayerProfile");

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type Profile = z.infer<typeof profileSchema>;
