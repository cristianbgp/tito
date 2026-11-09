import { expect, it } from "vitest";
import { summarizeProgress, type ProgressMatch } from "./progress";

const day = 86400000;
const now = Date.UTC(2026, 10, 7, 12);
const match = (
  id: string,
  time = now,
  values: Partial<ProgressMatch> = {},
): ProgressMatch => ({
  id,
  startedAt: time / 1000,
  result: "win",
  deaths: 0,
  goldPerMinute: 500,
  experiencePerMinute: null,
  ...values,
});

it("keeps empty periods and empty weeks unavailable rather than manufacturing zeros", () => {
  const data = summarizeProgress([], now);
  expect(data.current.stats).toMatchObject({
    games: 0,
    wins: 0,
    losses: 0,
    unknown: 0,
    winRate: { value: null, samples: 0 },
    deaths: { value: null, samples: 0 },
  });
  expect(data.weeks).toHaveLength(8);
  expect(
    data.weeks.every(
      (week) =>
        week.stats.games === 0 && week.stats.goldPerMinute.value === null,
    ),
  ).toBe(true);
  expect(Object.values(data.changes)).toEqual([null, null, null, null]);
});

it("counts exact period boundaries once, deduplicates IDs, and excludes future timestamps", () => {
  const edge = now - 28 * day;
  const oldest = now - 56 * day;
  const rows = [
    match("now"),
    match("edge", edge),
    match("previous", edge - 1000),
    match("oldest", oldest),
    match("too-old", oldest - 1000),
    match("future", now + 1000),
    match("edge", edge),
  ];
  const data = summarizeProgress(rows, now);
  expect(data.current.stats.games).toBe(2);
  expect(data.previous.stats.games).toBe(2);
  expect(data.current.from).toBe(new Date(edge).toISOString());
  expect(data.previous.to).toBe(new Date(edge).toISOString());
  expect(data.weeks[0].from).toBe("2026-09-14T00:00:00.000Z");
  expect(data.weeks.reduce((sum, week) => sum + week.stats.games, 0)).toBe(3);
});

it("uses per-metric known samples, preserves zero and gates changes until both samples reach five", () => {
  const rows = Array.from({ length: 5 }, (_, i) =>
    match(`current-${i}`, now - i * day, {
      result: i < 3 ? "win" : "loss",
      deaths: 0,
      goldPerMinute: i === 0 ? null : 600,
      experiencePerMinute: null,
    }),
  );
  rows.push(
    ...Array.from({ length: 5 }, (_, i) =>
      match(`previous-${i}`, now - (29 + i) * day, {
        result: i < 2 ? "win" : "loss",
        deaths: 4,
        goldPerMinute: 400,
        experiencePerMinute: null,
      }),
    ),
  );
  rows.push(
    match("unknown", now, { result: null, deaths: null, goldPerMinute: null }),
  );
  const data = summarizeProgress(rows, now);
  expect(data.current.stats.winRate).toEqual({ value: 0.6, samples: 5 });
  expect(data.current.stats.unknown).toBe(1);
  expect(data.current.stats.deaths).toEqual({ value: 0, samples: 5 });
  expect(data.current.stats.goldPerMinute).toEqual({ value: 600, samples: 4 });
  expect(data.changes.winRatePoints).toBeCloseTo(20);
  expect(data.changes.deaths).toBe(-4);
  expect(data.changes.goldPerMinute).toBeNull();
  expect(data.changes.experiencePerMinute).toBeNull();
});

it("uses Monday UTC weeks across year/leap boundaries and marks the current week partial", () => {
  const asOf = Date.UTC(2024, 0, 1, 0);
  const data = summarizeProgress(
    [match("sun", asOf - 1000), match("mon", asOf)],
    asOf,
  );
  expect(data.weeks[7]).toMatchObject({
    from: "2024-01-01T00:00:00.000Z",
    partial: true,
    stats: { games: 1 },
  });
  expect(data.weeks[6]).toMatchObject({
    from: "2023-12-25T00:00:00.000Z",
    partial: false,
    stats: { games: 1 },
  });
  const leap = summarizeProgress(
    [match("leap", Date.UTC(2024, 1, 29, 12))],
    Date.UTC(2024, 2, 3, 12),
  );
  expect(leap.weeks[7].from).toBe("2024-02-26T00:00:00.000Z");
  expect(leap.weeks[7].stats.games).toBe(1);
});
