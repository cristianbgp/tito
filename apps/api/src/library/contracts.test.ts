import { expect, it } from "vitest";
import {
  draftSnapshotInputSchema,
  poolInputSchema,
  noteInputSchema,
  feedbackInputSchema,
  reflectionQuerySchema,
  matchIdSchema,
} from "./contracts";
const input = {
  role: "5",
  allies: [1],
  enemies: [],
  bans: [2],
  pool: [5],
  useHistory: true,
};
it("rejects unknown or repeated pool heroes, oversized notes and manual owner injection", () => {
  expect(
    poolInputSchema.safeParse({
      entries: [{ heroId: 9999, preference: "favorite" }],
    }).success,
  ).toBe(false);
  expect(
    poolInputSchema.safeParse({
      entries: [
        { heroId: 5, preference: "favorite" },
        { heroId: 5, preference: "avoid" },
      ],
    }).success,
  ).toBe(false);
  expect(
    poolInputSchema.safeParse({ entries: [], userId: "other" }).success,
  ).toBe(false);
  expect(
    noteInputSchema.safeParse({ text: "x".repeat(4001), tags: [] }).success,
  ).toBe(false);
  expect(
    noteInputSchema.safeParse({ text: "", tags: Array(9).fill("x") }).success,
  ).toBe(false);
  expect(
    noteInputSchema.parse({ text: "", tags: [], bookmarkSeconds: 0 }),
  ).toMatchObject({ bookmarkSeconds: 0, actualRole: null });
  expect(
    feedbackInputSchema.safeParse({
      rating: "useful",
      comment: "x".repeat(501),
    }).success,
  ).toBe(false);
});
it("saves only known available draft choices and valid database match IDs", () => {
  expect(
    draftSnapshotInputSchema.safeParse({ input, chosenHeroId: 5 }).success,
  ).toBe(true);
  for (const chosenHeroId of [1, 2, 3, 9999])
    expect(
      draftSnapshotInputSchema.safeParse({ input, chosenHeroId }).success,
    ).toBe(false);
  expect(
    draftSnapshotInputSchema.safeParse({ input: { ...input, enemies: [9999] } })
      .success,
  ).toBe(false);
  expect(matchIdSchema.safeParse("9223372036854775808").success).toBe(false);
});
it("requires a real explicit UTC day", () => {
  expect(reflectionQuerySchema.safeParse({ mode: "day" }).success).toBe(false);
  expect(
    reflectionQuerySchema.safeParse({ mode: "day", day: "2026-02-30" }).success,
  ).toBe(false);
  expect(
    reflectionQuerySchema.parse({ mode: "day", day: "2026-11-07" }).day,
  ).toBe("2026-11-07");
});
