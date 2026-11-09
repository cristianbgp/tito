import { expect, it } from "vitest";
import {
  emptyDraft,
  editDraft,
  draftKey,
  loadDraft,
  saveDraft,
} from "./hero-draft";
it("keeps picks and bans exclusive, caps groups and lets pool choices overlap unavailable heroes", () => {
  let d = editDraft(emptyDraft(), "allies", 1);
  d = editDraft(d, "enemies", 1);
  expect(d.enemies).toEqual([]);
  d = editDraft(d, "pool", 1);
  expect(d.pool).toEqual([1]);
  for (const id of [2, 3, 4, 5]) d = editDraft(d, "allies", id);
  expect(d.allies).toEqual([1, 2, 3, 4]);
  d = editDraft(d, "allies", 1);
  expect(d.allies).toEqual([2, 3, 4]);
});
it("normalizes reordered draft keys and expires local input after four hours", () => {
  expect(draftKey({ ...emptyDraft(), pool: [1, 2] })).toBe(
    draftKey({ ...emptyDraft(), pool: [2, 1] }),
  );
  let stored = "";
  const storage = {
    getItem: () => stored,
    setItem: (_k: string, v: string) => {
      stored = v;
    },
  };
  const d = { ...emptyDraft(), enemies: [2] };
  saveDraft(storage, d, 1000);
  expect(loadDraft(storage, 2000)).toEqual(d);
  expect(loadDraft(storage, 1000 + 4 * 3600000)).toEqual(emptyDraft());
  stored = '{"role":"5","allies":[1,1]}';
  expect(loadDraft(storage, 2000)).toEqual(emptyDraft());
  expect(() =>
    saveDraft(
      {
        setItem: () => {
          throw new Error("blocked");
        },
      },
      d,
      1000,
    ),
  ).not.toThrow();
});
it("isolates private-derived input by account and never reads the old shared key", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
  const privateDraft = { ...emptyDraft(), pool: [5] };
  saveDraft(storage, privateDraft, 1000, "user-one:steam-one");
  expect(loadDraft(storage, 2000, "user-one:steam-one").pool).toEqual([5]);
  expect(loadDraft(storage, 2000, "user-two:steam-two").pool).toEqual([]);
  expect(loadDraft(storage, 2000).pool).toEqual([]);
});
