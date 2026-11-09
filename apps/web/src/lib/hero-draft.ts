import type { HeroDraftInput } from "../api/generated/models";
export type LocalDraft = Omit<HeroDraftInput, "role" | "useHistory"> & {
  role: HeroDraftInput["role"] | null;
  useHistory: boolean;
};
export type DraftGroup = "allies" | "enemies" | "bans" | "pool";
export const groupLimits = { allies: 4, enemies: 5, bans: 30, pool: 30 };
const storageKey = "tito:hero-picker:v2:";
export const emptyDraft = (): LocalDraft => ({
  role: null,
  allies: [],
  enemies: [],
  bans: [],
  pool: [],
  useHistory: true,
  useEvidence: false,
});
export function editDraft(
  draft: LocalDraft,
  group: DraftGroup,
  id: number,
): LocalDraft {
  if (draft[group].includes(id))
    return { ...draft, [group]: draft[group].filter((i) => i !== id) };
  if (
    draft[group].length >= groupLimits[group] ||
    (group !== "pool" &&
      [...draft.allies, ...draft.enemies, ...draft.bans].includes(id))
  )
    return draft;
  return { ...draft, [group]: [...draft[group], id] };
}
export function draftKey(draft: HeroDraftInput | LocalDraft) {
  return JSON.stringify({
    role: draft.role,
    allies: [...draft.allies].sort((a, b) => a - b),
    enemies: [...draft.enemies].sort((a, b) => a - b),
    bans: [...draft.bans].sort((a, b) => a - b),
    pool: [...draft.pool].sort((a, b) => a - b),
    useHistory: draft.useHistory !== false,
    useEvidence: draft.useEvidence === true,
  });
}
export function loadDraft(
  storage: Pick<Storage, "getItem">,
  now = Date.now(),
  scope = "guest",
): LocalDraft {
  try {
    const saved = JSON.parse(
      storage.getItem(storageKey + encodeURIComponent(scope)) ?? "null",
    );
    if (
      !saved ||
      typeof saved.expiresAt !== "number" ||
      saved.expiresAt <= now ||
      saved.expiresAt > now + 4 * 3600000
    )
      return emptyDraft();
    const d = saved.input;
    if (
      !d ||
      ![null, "1", "2", "3", "4", "5"].includes(d.role) ||
      typeof d.useHistory !== "boolean"
    )
      return emptyDraft();
    for (const group of Object.keys(groupLimits) as DraftGroup[])
      if (
        !Array.isArray(d[group]) ||
        d[group].length > groupLimits[group] ||
        d[group].some(
          (id: unknown) =>
            typeof id !== "number" ||
            !Number.isInteger(id) ||
            id < 1 ||
            id > 10000,
        ) ||
        new Set(d[group]).size !== d[group].length
      )
        return emptyDraft();
    const used = [...d.allies, ...d.enemies, ...d.bans];
    if (new Set(used).size !== used.length) return emptyDraft();
    return {
      role: d.role,
      allies: d.allies,
      enemies: d.enemies,
      bans: d.bans,
      pool: d.pool,
      useHistory: d.useHistory,
      useEvidence: d.useEvidence === true,
    };
  } catch {
    return emptyDraft();
  }
}
export function saveDraft(
  storage: Pick<Storage, "setItem">,
  input: LocalDraft,
  now = Date.now(),
  scope = "guest",
) {
  try {
    storage.setItem(
      storageKey + encodeURIComponent(scope),
      JSON.stringify({ input, expiresAt: now + 4 * 3600000 }),
    );
    return true;
  } catch {
    return false;
  }
}
