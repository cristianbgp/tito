import type { z } from "zod";
import type { recentMatchSchema } from "../dota/schemas";

export type ProgressMatch = Pick<
  z.infer<typeof recentMatchSchema>,
  | "id"
  | "startedAt"
  | "result"
  | "deaths"
  | "goldPerMinute"
  | "experiencePerMinute"
>;
const day = 86400000;
const minimumSamples = 5;

function stats(matches: readonly ProgressMatch[]) {
  const wins = matches.filter((match) => match.result === "win").length;
  const losses = matches.filter((match) => match.result === "loss").length;
  function average(key: "deaths" | "goldPerMinute" | "experiencePerMinute") {
    const values = matches
      .map((match) => match[key])
      .filter(
        (value): value is number =>
          value != null && Number.isFinite(value) && value >= 0,
      );
    return {
      value: values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null,
      samples: values.length,
    };
  }
  return {
    games: matches.length,
    wins,
    losses,
    unknown: matches.length - wins - losses,
    winRate: {
      value: wins + losses ? wins / (wins + losses) : null,
      samples: wins + losses,
    },
    deaths: average("deaths"),
    goldPerMinute: average("goldPerMinute"),
    experiencePerMinute: average("experiencePerMinute"),
  };
}

/** All intervals use one captured instant; future records never enter analytics. */
export function summarizeProgress(
  input: readonly ProgressMatch[],
  asOf: number,
) {
  const matches = [
    ...new Map(input.map((match) => [match.id, match])).values(),
  ].filter(
    (match) =>
      Number.isFinite(match.startedAt) &&
      match.startedAt >= 0 &&
      match.startedAt * 1000 <= asOf,
  );
  const currentStart = asOf - 28 * day;
  const previousStart = currentStart - 28 * day;
  const inRange = (from: number, to: number) =>
    matches.filter(
      (match) => match.startedAt * 1000 >= from && match.startedAt * 1000 < to,
    );
  const current = {
    from: new Date(currentStart).toISOString(),
    to: new Date(asOf).toISOString(),
    stats: stats(
      matches.filter((match) => match.startedAt * 1000 >= currentStart),
    ),
  };
  const previous = {
    from: new Date(previousStart).toISOString(),
    to: new Date(currentStart).toISOString(),
    stats: stats(inRange(previousStart, currentStart)),
  };
  const instant = new Date(asOf);
  const today = Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate(),
  );
  const monday = today - ((instant.getUTCDay() + 6) % 7) * day;
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const from = monday - (7 - index) * 7 * day;
    const to = from + 7 * day;
    return {
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      partial: index === 7,
      stats: stats(inRange(from, to)),
    };
  });
  function change(
    key: "winRate" | "deaths" | "goldPerMinute" | "experiencePerMinute",
  ) {
    const a = current.stats[key],
      b = previous.stats[key];
    return a.value != null &&
      b.value != null &&
      a.samples >= minimumSamples &&
      b.samples >= minimumSamples
      ? a.value - b.value
      : null;
  }
  const rate = change("winRate");
  return {
    asOf: new Date(asOf).toISOString(),
    timeZone: "UTC" as const,
    minimumSamples,
    current,
    previous,
    weeks,
    changes: {
      winRatePoints: rate == null ? null : rate * 100,
      deaths: change("deaths"),
      goldPerMinute: change("goldPerMinute"),
      experiencePerMinute: change("experiencePerMinute"),
    },
  };
}
