import { DraftError, type DraftHero, type DraftInput } from "./contracts";
import type { DraftEvidence } from "./evidence";
export type Candidate = Omit<DraftHero, "image"> & {
  savedGames: number;
  favorite: boolean;
};
export type DraftPreferences = {
  favorites?: readonly number[];
  avoided?: readonly number[];
};
export type DraftContext = {
  role: DraftInput["role"];
  allies: Omit<DraftHero, "image">[];
  enemies: Omit<DraftHero, "image">[];
  candidates: Candidate[];
  historyGames: number;
  evidence?: DraftEvidence;
};
export function canonicalDraft(input: DraftInput): DraftInput {
  return {
    ...input,
    useEvidence: input.useEvidence === true,
    allies: [...input.allies].sort((a, b) => a - b),
    enemies: [...input.enemies].sort((a, b) => a - b),
    bans: [...input.bans].sort((a, b) => a - b),
    pool: [...input.pool].sort((a, b) => a - b),
  };
}
function profile({ image: _, ...hero }: DraftHero) {
  return hero;
}
export function buildDraftContext(
  input: DraftInput,
  heroes: DraftHero[],
  history: { heroId: number }[],
  preferences: DraftPreferences = {},
): DraftContext {
  const d = canonicalDraft(input),
    byId = new Map(heroes.map((h) => [h.id, h]));
  if (
    [...d.allies, ...d.enemies, ...d.bans, ...d.pool].some(
      (id) => !byId.has(id),
    )
  )
    throw new DraftError(
      "This draft contains an unknown hero. Remove it and try again.",
      400,
    );
  const unavailable = new Set([...d.allies, ...d.enemies, ...d.bans]);
  const pool = new Set(d.pool);
  const favorites = new Set([...d.pool, ...(preferences.favorites ?? [])]);
  const avoided = new Set(preferences.avoided ?? []);
  const experience = new Map<number, number>();
  if (d.useHistory)
    for (const m of history.slice(0, 1000))
      experience.set(m.heroId, (experience.get(m.heroId) ?? 0) + 1);
  const weights: Record<
    DraftInput["role"],
    Partial<Record<DraftHero["roles"][number], number>>
  > = {
    "1": { Carry: 10, Escape: 1 },
    "2": { Nuker: 4, Carry: 2, Escape: 1 },
    "3": { Durable: 4, Initiator: 3, Disabler: 1 },
    "4": { Support: 5, Disabler: 3, Initiator: 1 },
    "5": { Support: 8, Disabler: 2, Nuker: 1 },
  };
  const priority = (h: DraftHero) =>
    h.roles.reduce((v, r) => v + (weights[d.role][r] ?? 0), 0) +
    Math.min(experience.get(h.id) ?? 0, 20) * 0.05;
  const available = heroes
    .filter(
      (h) => !unavailable.has(h.id) && (!avoided.has(h.id) || pool.has(h.id)),
    )
    .sort((a, b) => priority(b) - priority(a) || a.id - b.id);
  // Favorites augment the broad shortlist; they never replace its general picks.
  const general = available.slice(0, 16);
  const included = new Set(general.map((h) => h.id));
  const extraFavorites = available
    .filter((h) => favorites.has(h.id) && !included.has(h.id))
    .slice(0, 4);
  const candidates = [...general, ...extraFavorites].map((h) => ({
    ...profile(h),
    savedGames: experience.get(h.id) ?? 0,
    favorite: favorites.has(h.id),
  }));
  if (!candidates.length)
    throw new DraftError(
      "No heroes are available for this draft. Remove a pick, ban or saved Avoid preference.",
      409,
    );
  return {
    role: d.role,
    allies: d.allies.map((id) => profile(byId.get(id)!)),
    enemies: d.enemies.map((id) => profile(byId.get(id)!)),
    candidates,
    historyGames: d.useHistory ? Math.min(history.length, 1000) : 0,
  };
}
