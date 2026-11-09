import { expect, it } from "vitest";
import { draftInputSchema } from "./contracts";
import { buildDraftContext, canonicalDraft } from "./context";
import { heroCatalog } from "./catalog";

const draft = () =>
  draftInputSchema.parse({
    role: "5",
    allies: [],
    enemies: [],
    bans: [],
    pool: [],
    useHistory: true,
  });
it("rejects duplicates, overlapping picks/bans, excessive groups and unknown IDs", () => {
  for (const fields of [
    { allies: [1, 1] },
    { allies: [1], enemies: [1] },
    { allies: [1], bans: [1] },
    { allies: [1, 2, 3, 4, 5] },
    { pool: [1, 1] },
  ])
    expect(draftInputSchema.safeParse({ ...draft(), ...fields }).success).toBe(
      false,
    );
  expect(() =>
    buildDraftContext({ ...draft(), bans: [99999] }, heroCatalog, []),
  ).toThrow(/hero/i);
});
it("treats the current pool as favorites without excluding better available heroes", () => {
  const c = buildDraftContext(
    { ...draft(), pool: [1, 2, 3], allies: [1], bans: [2] },
    heroCatalog,
    [],
  );
  expect(c.candidates.some((hero) => ![1, 2, 3].includes(hero.id))).toBe(true);
  expect(c.candidates.find((hero) => hero.id === 3)?.favorite).toBe(true);
  expect(c.candidates.some((hero) => [1, 2].includes(hero.id))).toBe(false);
  expect(
    buildDraftContext({ ...draft(), pool: [1], bans: [1] }, heroCatalog, [])
      .candidates.length,
  ).toBeGreaterThan(0);
});
it("keeps the general shortlist and adds bounded favorites, respecting saved avoid choices and explicit draft overrides", () => {
  const general = buildDraftContext(draft(), heroCatalog, []).candidates.map(
    (hero) => hero.id,
  );
  const outside = heroCatalog
    .filter((hero) => !general.includes(hero.id))
    .slice(0, 30)
    .map((hero) => hero.id);
  const mixed = buildDraftContext(
    { ...draft(), pool: outside },
    heroCatalog,
    [],
  );
  expect(mixed.candidates).toHaveLength(20);
  expect(
    general.every((id) => mixed.candidates.some((hero) => hero.id === id)),
  ).toBe(true);
  expect(mixed.candidates.filter((hero) => hero.favorite)).toHaveLength(4);
  const saved = buildDraftContext(draft(), heroCatalog, [], {
    favorites: [2, 5],
    avoided: [5],
  });
  expect(saved.candidates.find((hero) => hero.id === 2)?.favorite).toBe(true);
  expect(saved.candidates.some((hero) => hero.id === 5)).toBe(false);
  const override = buildDraftContext(
    { ...draft(), pool: [5] },
    heroCatalog,
    [],
    { favorites: [2], avoided: [5] },
  );
  expect(override.candidates.find((hero) => hero.id === 5)?.favorite).toBe(
    true,
  );
});
it("uses a deterministic role shortlist of at most sixteen and respects the history opt-out", () => {
  const c = buildDraftContext(draft(), heroCatalog, [
    { heroId: 5 },
    { heroId: 5 },
  ]);
  expect(c.candidates).toHaveLength(16);
  expect(c.candidates[0].roles).toContain("Support");
  expect(c.candidates.find((h) => h.id === 5)?.savedGames).toBe(2);
  expect(
    buildDraftContext({ ...draft(), useHistory: false }, heroCatalog, [
      { heroId: 5 },
    ]).candidates.every((h) => h.savedGames === 0),
  ).toBe(true);
  expect(JSON.stringify(c)).not.toMatch(/accountId|steamId|email|heroImage/);
});
it("canonicalizes unordered groups and uses only catalog fields in evidence", () => {
  const a = { ...draft(), allies: [2, 1], pool: [5, 3, 4] };
  const b = { ...a, allies: [1, 2], pool: [4, 5, 3] };
  expect(canonicalDraft(a)).toEqual(canonicalDraft(b));
  expect(buildDraftContext(a, heroCatalog, [])).toEqual(
    buildDraftContext(b, heroCatalog, []),
  );
});
