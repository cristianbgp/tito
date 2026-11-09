import type { AdvantagePoint } from "../../api/generated/models";

export function chartGeometry(points: AdvantagePoint[], endTime?: number) {
  const lastTime = Math.max(
    0,
    endTime ?? 0,
    ...points.map((point) => point.time),
  );
  const maxTime = Math.max(1, lastTime);
  const maxValue = Math.max(
    1,
    ...points.map((point) => Math.abs(point.value ?? 0)),
  );
  const bound = Math.max(1, Math.ceil(maxValue / 1000) * 1000);
  const x = (time: number) => 64 + (time / maxTime) * 552;
  const y = (value: number) => 110 - (value / bound) * 86;
  const paths: string[] = [];
  let path = "";
  for (const point of points) {
    if (point.value == null) {
      if (path) paths.push(path);
      path = "";
    } else {
      path += `${path ? " L" : "M"}${x(point.time).toFixed(2)},${y(point.value).toFixed(2)}`;
    }
  }
  if (path) paths.push(path);
  const tickStep = Math.max(300, Math.ceil(lastTime / (300 * 6)) * 300);
  const ticks = [0];
  for (let time = tickStep; time <= lastTime; time += tickStep)
    ticks.push(time);
  // Keep the real endpoint, without squeezing a final label against a nearby tick.
  if (lastTime > 0 && ticks.at(-1) !== lastTime) {
    if (ticks.length > 1 && lastTime - ticks.at(-1)! < tickStep / 2)
      ticks.pop();
    ticks.push(lastTime);
  }
  return { bound, paths, x, y, maxTime, ticks };
}
