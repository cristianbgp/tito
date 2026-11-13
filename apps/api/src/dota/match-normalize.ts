import type { z } from "zod";
import type { detailSchema } from "./upstream";
import type { matchDetailSchema } from "./schemas";
import { advantagePoints, minuteSamples } from "./upstream";
import {
  assetUrl,
  itemSlot,
  type heroCatalogSchema,
  type itemCatalogSchema,
  type clusterSchema,
  type regionSchema,
} from "./assets";

type Catalogs = {
  heroes: z.infer<typeof heroCatalogSchema> | null;
  itemCatalog: z.infer<typeof itemCatalogSchema> | null;
  clusters: z.infer<typeof clusterSchema> | null;
  regions: z.infer<typeof regionSchema> | null;
};
export function normalizeMatch(
  match: z.infer<typeof detailSchema>,
  { heroes, itemCatalog, clusters, regions }: Catalogs,
): z.infer<typeof matchDetailSchema> {
  const items = new Map(
    Object.values(itemCatalog ?? {}).map((item) => [item.id, item]),
  );
  const regionId =
    match.region ??
    (match.cluster == null ? null : clusters?.[String(match.cluster)]);
  return {
    id: String(match.match_id),
    startedAt: match.start_time,
    duration: match.duration,
    winner:
      match.radiant_win == null ? null : match.radiant_win ? "radiant" : "dire",
    parsed: (match.version ?? 0) > 0,
    gameMode: match.game_mode ?? null,
    lobbyType: match.lobby_type ?? null,
    patch: match.patch ?? null,
    objectives:
      match.objectives == null
        ? null
        : match.objectives
            .filter((e) => e.time <= match.duration)
            .slice(0, 100)
            .map((e) => ({
              time: e.time,
              type: e.type,
              playerSlot: e.player_slot ?? null,
              target: e.key == null ? null : String(e.key),
            })),
    teamfights:
      match.teamfights == null
        ? null
        : match.teamfights
            .filter((e) => e.start >= 0 && e.start <= match.duration)
            .slice(0, 50)
            .map((e) => ({
              time: e.start,
              endTime:
                e.end != null && e.end >= e.start && e.end <= match.duration
                  ? e.end
                  : null,
              deaths: e.deaths ?? null,
            })),
    region: regionId == null ? null : (regions?.[String(regionId)] ?? null),
    radiantScore: match.radiant_score ?? null,
    direScore: match.dire_score ?? null,
    metadataAvailable: heroes != null && itemCatalog != null,
    goldAdvantage: advantagePoints(
      match.radiant_gold_adv,
      match.players,
      match.duration,
    ),
    experienceAdvantage: advantagePoints(
      match.radiant_xp_adv,
      match.players,
      match.duration,
    ),
    players: match.players.slice(0, 10).map((player) => ({
      heroId: player.hero_id,
      hero:
        heroes?.[String(player.hero_id)]?.localized_name ??
        `Hero ${player.hero_id}`,
      heroImage: assetUrl(heroes?.[String(player.hero_id)]?.img),
      slot: player.player_slot,
      accountId:
        player.account_id && player.account_id < 4294967295
          ? String(player.account_id)
          : null,
      name: player.personaname || player.name || null,
      team: player.player_slot < 128 ? "radiant" : "dire",
      kills: player.kills ?? null,
      deaths: player.deaths ?? null,
      assists: player.assists ?? null,
      goldPerMinute: player.gold_per_min ?? null,
      experiencePerMinute: player.xp_per_min ?? null,
      lastHits: player.last_hits ?? null,
      denies: player.denies ?? null,
      level: player.level ?? null,
      netWorth: player.net_worth ?? null,
      heroDamage: player.hero_damage ?? null,
      heroHealing: player.hero_healing ?? null,
      towerDamage: player.tower_damage ?? null,
      inventory: [
        player.item_0,
        player.item_1,
        player.item_2,
        player.item_3,
        player.item_4,
        player.item_5,
      ].map((id) => itemSlot(id, items)),
      backpack: [player.backpack_0, player.backpack_1, player.backpack_2].map(
        (id) => itemSlot(id, items),
      ),
      neutralItem: itemSlot(player.item_neutral, items),
      neutralEnhancement: itemSlot(player.item_neutral2, items),
      actualRole: null,
      purchases:
        player.purchase_log == null
          ? null
          : player.purchase_log
              .filter((e) => e.time <= match.duration)
              .slice(0, 100)
              .map((event) => {
                const item = itemCatalog?.[event.key];
                return {
                  time: event.time,
                  key: event.key,
                  itemId: item?.id ?? null,
                  name: item?.dname ?? null,
                  image: assetUrl(item?.img),
                };
              }),
      minuteSamples: minuteSamples(player, match.duration),
      killEvents:
        player.kills_log == null
          ? null
          : player.kills_log
              .filter((e) => e.time <= match.duration)
              .slice(0, 100)
              .map((e) => ({ time: e.time, target: e.key })),
    })),
  };
}
