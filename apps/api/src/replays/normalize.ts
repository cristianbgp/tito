import { z } from "zod";
import { detailSchema } from "../dota/upstream";
import { matchDetailSchema } from "../dota/schemas";
import { normalizeMatch } from "../dota/match-normalize";
import heroes from "../draft/heroes.snapshot.json";
import items from "./items.snapshot.json";
import { ReplayError } from "./errors";

const catalogs = {
  heroes: Object.fromEntries(
    heroes.heroes.map((h) => [
      h.id,
      { id: h.id, localized_name: h.name, img: h.image },
    ]),
  ),
  itemCatalog: items.items,
  clusters: null,
  regions: null,
};
const input = detailSchema.extend({
  duration: z.number().positive().max(14400),
  radiant_win: z.boolean(),
  players: detailSchema.shape.players.min(1).max(10),
});

export function normalizeReplay(value: unknown, accountId: string) {
  const result = input.safeParse(value);
  if (!result.success)
    throw new ReplayError(
      "This replay has incomplete or unsupported match data.",
    );
  const raw = result.data;
  if (
    new Set(raw.players.map((p) => p.player_slot)).size !== raw.players.length
  )
    throw new ReplayError(
      "This replay has incomplete or unsupported match data.",
    );
  if (!raw.players.some((p) => String(p.account_id) === accountId))
    throw new ReplayError(
      "Your linked Steam account is not a player in this replay.",
      403,
    );
  const names = new Map(
    Object.entries(items.items).map(([key, item]) => [item.id, key]),
  );
  for (const player of raw.players) {
    // Recent replays may put an enhancement in the legacy neutral slot.
    if (
      player.item_neutral &&
      names.get(player.item_neutral)?.startsWith("enhancement_")
    ) {
      player.item_neutral2 = player.item_neutral;
      player.item_neutral = null;
    }
  }
  return matchDetailSchema.parse({
    ...normalizeMatch(raw, catalogs),
    source: "replay",
  });
}
