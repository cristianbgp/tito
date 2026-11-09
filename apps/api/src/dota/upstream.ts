import { z } from "zod";

const stat = z.number().nonnegative().nullish();
const id = z.number().int().nonnegative().nullish();
export const playerSchema = z.object({
  hero_id: z.number().int().nonnegative(),
  player_slot: z.number().int().min(0).max(255),
  account_id: z.number().int().min(0).max(4294967295).nullish(),
  personaname: z.string().nullish(),
  name: z.string().nullish(),
  kills: stat,
  deaths: stat,
  assists: stat,
  gold_per_min: stat,
  xp_per_min: stat,
  last_hits: stat,
  denies: stat,
  level: stat,
  net_worth: stat,
  hero_damage: stat,
  hero_healing: stat,
  tower_damage: stat,
  item_0: id,
  item_1: id,
  item_2: id,
  item_3: id,
  item_4: id,
  item_5: id,
  backpack_0: id,
  backpack_1: id,
  backpack_2: id,
  item_neutral: id,
  item_neutral2: id,
  times: z.array(z.number()).nullish(),
  gold_t: z.array(z.number().nullable()).nullish(),
  xp_t: z.array(z.number().nullable()).nullish(),
  lh_t: z.array(z.number().nullable()).nullish(),
  purchase_log: z
    .array(z.object({ time: z.number(), key: z.string().max(128) }))
    .nullish(),
  kills_log: z
    .array(z.object({ time: z.number(), key: z.string().max(128) }))
    .nullish(),
});
const matchBase = z.object({
  match_id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  start_time: z.number().int().min(0).max(8_640_000_000_000),
  duration: z.number().nonnegative(),
  radiant_win: z.boolean().nullish(),
  game_mode: id,
  lobby_type: id,
  patch: id,
});
export const recentSchema = z.array(matchBase.extend(playerSchema.shape));
export const detailSchema = matchBase.extend({
  version: z.number().nullish(),
  objectives: z
    .array(
      z.object({
        time: z.number(),
        type: z.string().max(128),
        player_slot: z.number().int().min(0).max(255).nullish(),
        key: z.union([z.string().max(128), z.number()]).nullish(),
      }),
    )
    .nullish(),
  teamfights: z
    .array(
      z.object({ start: z.number(), end: z.number().nullish(), deaths: stat }),
    )
    .nullish(),
  game_mode: id,
  lobby_type: id,
  region: id,
  cluster: id,
  radiant_score: stat,
  dire_score: stat,
  radiant_gold_adv: z.array(z.number().nullable()).nullish(),
  radiant_xp_adv: z.array(z.number().nullable()).nullish(),
  players: z.array(playerSchema),
});

export function advantagePoints(
  values: (number | null)[] | null | undefined,
  players: z.infer<typeof playerSchema>[],
  duration: number,
) {
  if (!values) return [];
  const times = players
    .map((p) => p.times)
    .find(
      (t) =>
        t?.length === values.length &&
        t.every((v, i) => v >= 0 && (i === 0 || v > t[i - 1])),
    );
  return values
    .map((value, i) => ({ time: times?.[i] ?? i * 60, value }))
    .filter((point) => point.time <= duration);
}

// Missing sample arrays mean unknown; an observed 0 is retained as 0.
export function minuteSamples(
  player: z.infer<typeof playerSchema>,
  duration: number,
) {
  if (
    !player.times ||
    ![player.gold_t, player.xp_t, player.lh_t].some((v) => v != null)
  )
    return null;
  const samples: {
    time: number;
    gold: number | null;
    experience: number | null;
    lastHits: number | null;
  }[] = [];
  let previous = -1;
  for (let i = 0; i < player.times.length && samples.length < 121; i++) {
    const time = player.times[i]!;
    if (time < 0 || time > duration || time <= previous) continue;
    previous = time;
    samples.push({
      time,
      gold: player.gold_t?.[i] ?? null,
      experience: player.xp_t?.[i] ?? null,
      lastHits: player.lh_t?.[i] ?? null,
    });
  }
  return samples;
}
