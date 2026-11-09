import type { AdvantagePoint } from "../../api/generated/models";

export function momentumRows(gold: AdvantagePoint[], xp: AdvantagePoint[]) {
  const goldByTime = new Map(gold.map((p) => [p.time, p.value]));
  const xpByTime = new Map(xp.map((p) => [p.time, p.value]));
  return [...new Set([...goldByTime.keys(), ...xpByTime.keys()])]
    .sort((a, b) => a - b)
    .map((time) => ({
      time,
      gold: goldByTime.get(time) ?? null,
      xp: xpByTime.get(time) ?? null,
    }));
}

export type GoldMoment = {
  kind: "swing" | "lead";
  start: number;
  time: number;
  value: number;
};

export function goldMoments(points: AdvantagePoint[]): GoldMoment[] {
  let biggest: GoldMoment | undefined;
  let previousLead: AdvantagePoint | undefined;
  const changes: GoldMoment[] = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point.value == null) {
      previousLead = undefined;
      continue;
    }
    const previous = points[i - 1];
    if (previous?.value != null) {
      const difference = point.value - previous.value;
      if (Math.abs(difference) > Math.abs(biggest?.value ?? 0)) {
        biggest = {
          kind: "swing",
          start: previous.time,
          time: point.time,
          value: difference,
        };
      }
    }
    if (point.value !== 0) {
      if (
        previousLead?.value != null &&
        Math.sign(previousLead.value) !== Math.sign(point.value)
      ) {
        changes.push({
          kind: "lead",
          start: previousLead.time,
          time: point.time,
          value: point.value,
        });
      }
      previousLead = point;
    }
  }
  return [...(biggest ? [biggest] : []), ...changes.slice(-2)];
}
