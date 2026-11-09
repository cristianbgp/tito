import { expect, test } from "vitest";
import { appText } from "./typography";
test("formats generated and sourced app prose without em dashes", () => {
  expect(appText("Economy—review the next objective.")).toBe(
    "Economy, review the next objective.",
  );
  expect(appText("You farmed steadily — check the replay.")).toBe(
    "You farmed steadily, check the replay.",
  );
  expect(appText("First — second — third")).toBe("First, second, third");
  expect(appText("Already ordinary prose.")).toBe("Already ordinary prose.");
});
