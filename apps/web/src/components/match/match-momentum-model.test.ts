import { expect, it } from "vitest";
import { momentumRows, goldMoments } from "./match-momentum-model";
import { chartGeometry } from "./chart-geometry";

it("aligns actual timestamps without filling absent or null samples", () => {
  expect(
    momentumRows(
      [
        { time: 0, value: 0 },
        { time: 60, value: null },
        { time: 180, value: -4000 },
      ],
      [
        { time: 0, value: 0 },
        { time: 120, value: 300 },
        { time: 240, value: 500 },
      ],
    ),
  ).toEqual([
    { time: 0, gold: 0, xp: 0 },
    { time: 60, gold: null, xp: null },
    { time: 120, gold: null, xp: 300 },
    { time: 180, gold: -4000, xp: null },
    { time: 240, gold: null, xp: 500 },
  ]);
  expect(momentumRows([], [])).toEqual([]);
});

it("describes real gold swings and lead changes without crossing missing evidence", () => {
  expect(
    goldMoments([
      { time: 0, value: 0 },
      { time: 60, value: 1000 },
      { time: 120, value: 0 },
      { time: 180, value: -4000 },
      { time: 240, value: null },
      { time: 300, value: 20000 },
    ]),
  ).toEqual([
    { kind: "swing", start: 120, time: 180, value: -4000 },
    { kind: "lead", start: 60, time: 180, value: -4000 },
  ]);
  expect(goldMoments([{ time: 0, value: 0 }])).toEqual([]);
  expect(goldMoments([{ time: 0, value: null }])).toEqual([]);
});

it("shares the end time between plots while preserving gaps and useful time ticks", () => {
  const model = chartGeometry(
    [
      { time: 0, value: 100 },
      { time: 60, value: null },
      { time: 180, value: -100 },
    ],
    1500,
  );
  expect(model.maxTime).toBe(1500);
  expect(model.x(750)).toBe(340);
  expect(model.paths).toHaveLength(2);
  expect(model.ticks).toEqual([0, 300, 600, 900, 1200, 1500]);
  const short = chartGeometry([{ time: 0, value: 0 }]);
  expect(short.paths.join()).not.toMatch(/NaN|Infinity/);
  expect(short.ticks).toEqual([0]);
});
