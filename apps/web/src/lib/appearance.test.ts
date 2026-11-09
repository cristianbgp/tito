import { expect, it } from "vitest";
import {
  parseAppearance,
  resolveAppearance,
  readAppearance,
} from "./appearance";

it("keeps explicit choices independent of system appearance", () => {
  expect(resolveAppearance("dark", false)).toBe("dark");
  expect(resolveAppearance("light", true)).toBe("light");
  expect(resolveAppearance("system", true)).toBe("dark");
  expect(resolveAppearance("system", false)).toBe("light");
});
it("falls back to the system for invalid or inaccessible stored preferences", () => {
  expect(parseAppearance("sepia")).toBe("system");
  expect(parseAppearance(null)).toBe("system");
  expect(
    readAppearance({
      getItem: () => {
        throw new Error("Blocked storage");
      },
    }),
  ).toBe("system");
  expect(readAppearance({ getItem: () => "dark" })).toBe("dark");
});
