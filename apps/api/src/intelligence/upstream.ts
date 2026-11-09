import { z } from "zod";
import { percentileSchema } from "./contracts";
const count = z.number().int().nonnegative();
export const matchupsUpstream = z.array(
  z
    .object({ hero_id: count, games_played: count, wins: count })
    .refine((r) => r.wins <= r.games_played),
);
export const benchmarksUpstream = z.object({
  hero_id: count,
  result: z.record(z.string(), z.array(percentileSchema)),
});
export const popularityUpstream = z.object({
  start_game_items: z.record(z.string().regex(/^\d+$/), count).optional(),
  early_game_items: z.record(z.string().regex(/^\d+$/), count).optional(),
  mid_game_items: z.record(z.string().regex(/^\d+$/), count).optional(),
  late_game_items: z.record(z.string().regex(/^\d+$/), count).optional(),
});
export const patchesUpstream = z.array(
  z.object({
    id: count.nullish(),
    name: z.string().regex(/^\d+\.\d+[a-z]?$/),
    date: z.string().datetime({ offset: true }).nullish(),
  }),
);
export const valvePatchListUpstream = z.object({
  patches: z.array(
    z.object({
      patch_number: z.string().regex(/^\d+\.\d+[a-z]?$/),
      patch_timestamp: z.number().int().nonnegative().max(8_640_000_000_000),
    }),
  ),
  success: z.literal(true),
});
const note = z.object({
  note: z.string().max(20000),
  info: z.string().max(20000).optional(),
});
export const valvePatchUpstream = z.object({
  patch_number: z.string(),
  patch_timestamp: z.number().int().nonnegative().max(8_640_000_000_000),
  general_notes: z
    .array(z.object({ generic: z.array(note).optional() }))
    .optional(),
  heroes: z
    .array(
      z.object({
        hero_id: count,
        hero_notes: z.array(note).optional(),
        talent_notes: z.array(note).optional(),
        abilities: z
          .array(
            z.object({
              ability_id: count,
              ability_notes: z.array(note).optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});
