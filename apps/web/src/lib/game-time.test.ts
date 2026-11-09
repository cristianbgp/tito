import { expect, it } from "vitest";
import { duration } from "../i18n";
import { matchText } from "./typography";

it("formats match clocks with hours when needed and keeps pregame times negative", () => {
  for (const [seconds, expected] of [
    [0, "0:00"],
    [59, "0:59"],
    [1600, "26:40"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3750, "1:02:30"],
    [-90, "−1:30"],
    [1600.9, "26:40"],
  ] as const) {
    expect(duration(seconds)).toBe(expected);
  }
});

it("formats elapsed time in saved English and Spanish AI prose without changing stats or IDs", () => {
  expect(
    matchText("At 1600s, review the lead. After 3750 seconds, check again."),
  ).toBe("At 26:40, review the lead. After 1:02:30, check again.");
  expect(matchText("A los 1600 segundos; revisa 600 seg. y -90s.")).toBe(
    "A los 26:40; revisa 10:00. y −1:30.",
  );
  expect(
    matchText(
      "At 1,600s and 3600 sec, with 1600 gold, 500 GPM and match.duration.1600.",
    ),
  ).toBe(
    "At 26:40 and 1:00:00, with 1600 gold, 500 GPM and match.duration.1600.",
  );
});

it("leaves clock text, fractional mechanics, rates, links, and identifiers intact", () => {
  const text =
    "26:40; 1:02:30; 0.5s stun; 1,5 segundos; 10s/charge; x1600s; match.1600s; https://example.com/?t=1600s";
  expect(matchText(text)).toBe(text);
});
