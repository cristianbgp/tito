import type { z } from "zod";
import { formatGameTimesInText } from "../../../../shared/game-time";
import type { matchDetailSchema, recentMatchSchema } from "../dota/schemas";
import {
  ReviewError,
  reviewOutputSchema,
  type ReviewContext,
} from "./contracts";

type Detail = z.infer<typeof matchDetailSchema>;
type Summary = z.infer<typeof recentMatchSchema>;
const summaryMetrics = [
  "kills",
  "deaths",
  "assists",
  "goldPerMinute",
  "experiencePerMinute",
] as const;
const detailMetrics = [
  "lastHits",
  "denies",
  "level",
  "netWorth",
  "heroDamage",
  "heroHealing",
  "towerDamage",
] as const;

export function buildReviewContext(
  accountId: string,
  detail: Detail | null,
  saved: Summary | undefined,
  history: Summary[],
  matchId = detail?.id ?? saved?.id,
): ReviewContext {
  const player =
    detail && detail.id === matchId
      ? detail.players.find((p) => p.accountId === accountId)
      : undefined;
  const owned =
    saved?.accountId === accountId && saved.id === matchId ? saved : undefined;
  if (!player && !owned)
    throw new ReviewError(
      "Only your own match can be reviewed. Connect the Steam account that played this game or sync its saved history.",
      403,
    );
  const current = player ?? owned!;
  const startedAt = player ? detail!.startedAt : owned!.startedAt;
  const duration = player ? detail!.duration : owned!.duration;
  if (!(duration > 0))
    throw new ReviewError(
      "This match does not have enough valid statistics to review yet.",
      409,
    );
  const result =
    player && detail?.winner
      ? player.team === detail.winner
        ? "win"
        : "loss"
      : owned?.result;
  const facts: ReviewContext["facts"] = [];
  const add = (
    metric: ReviewContext["facts"][number]["metric"],
    value: number | null | undefined,
    source: "match" | "baseline" = "match",
    samples = 1,
    atSeconds: number | null = null,
  ) => {
    if (typeof value === "number" && Number.isFinite(value))
      facts.push({
        id: `${source}.${metric}${atSeconds === null ? "" : `.${atSeconds}`}`,
        metric,
        value,
        source,
        samples,
        atSeconds,
      });
  };
  add("duration", duration);
  if (result) add("result", result === "win" ? 1 : 0);
  for (const metric of summaryMetrics) add(metric, current[metric]);
  if (player) for (const metric of detailMetrics) add(metric, player[metric]);
  const comparable = history
    .filter(
      (m) =>
        m.accountId === accountId &&
        m.id !== matchId &&
        m.startedAt < startedAt &&
        m.heroId === current.heroId &&
        m.duration >= duration * 0.75 &&
        m.duration <= duration * 1.25,
    )
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 20);
  for (const metric of summaryMetrics) {
    const values = comparable
      .map((m) => m[metric])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (values.length >= 5)
      add(
        metric,
        values.reduce((a, b) => a + b, 0) / values.length,
        "baseline",
        values.length,
      );
  }
  if (player && detail)
    for (const [metric, points] of [
      ["teamGoldAdvantage", detail.goldAdvantage],
      ["teamExperienceAdvantage", detail.experienceAdvantage],
    ] as const) {
      for (const time of [600, 1200, 1800])
        if (time <= duration) {
          const point = points.find((p) => p.time === time);
          if (point?.value !== null && point?.value !== undefined)
            add(
              metric,
              point.value * (player.team === "radiant" ? 1 : -1),
              "match",
              1,
              time,
            );
        }
    }
  if (
    !facts.some(
      (f) =>
        f.source === "match" &&
        summaryMetrics.includes(f.metric as (typeof summaryMetrics)[number]),
    )
  )
    throw new ReviewError(
      "This match does not have enough player statistics to review yet.",
      409,
    );
  return {
    hero: current.hero.slice(0, 100),
    coverage: facts.some((f) => f.atSeconds !== null)
      ? "timeline"
      : player
        ? "details"
        : "summary",
    comparableGames: comparable.length,
    facts,
  };
}

export function validateReview(value: unknown, context: ReviewContext) {
  const parsed = reviewOutputSchema.safeParse(value);
  if (!parsed.success)
    throw new ReviewError(
      "The AI review could not be validated. Your previous review is still available.",
      502,
    );
  const known = new Map(context.facts.map((f) => [f.id, f]));
  for (const item of [
    ...parsed.data.wentWell,
    ...parsed.data.wentWrong,
    ...parsed.data.improve,
  ]) {
    if (
      item.evidenceIds.some((id) => !known.has(id)) ||
      !item.evidenceIds.some((id) => known.get(id)?.source === "match")
    )
      throw new ReviewError(
        "The AI review cited unavailable evidence. Your previous review is still available.",
        502,
      );
  }
  const content = parsed.data;
  return reviewOutputSchema.parse({
    ...content,
    summary: formatGameTimesInText(content.summary),
    wentWell: content.wentWell.map((item) => ({
      ...item,
      title: formatGameTimesInText(item.title),
      interpretation: formatGameTimesInText(item.interpretation),
    })),
    wentWrong: content.wentWrong.map((item) => ({
      ...item,
      title: formatGameTimesInText(item.title),
      interpretation: formatGameTimesInText(item.interpretation),
    })),
    improve: content.improve.map((item) => ({
      ...item,
      title: formatGameTimesInText(item.title),
      action: formatGameTimesInText(item.action),
    })),
  });
}
