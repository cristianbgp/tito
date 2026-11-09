import {
  cannedQuestions,
  CoachingError,
  coachingOutputSchema,
  type CoachingInsights,
  type FollowUpInput,
} from "./contracts";
export type CoachingMatch = {
  matchId: bigint;
  startedAt: number;
  duration: number;
  heroId: number;
  result: "win" | "loss" | null;
  deaths: number | null;
  goldPerMinute: number | null;
  experiencePerMinute: number | null;
};
const metrics = ["deaths", "goldPerMinute", "experiencePerMinute"] as const;
export function buildInsights(
  rows: CoachingMatch[],
  verified: boolean,
  now: number,
): CoachingInsights {
  const result: CoachingInsights = {
    asOf: new Date(now).toISOString(),
    verified,
    retainedMatches: verified ? rows.length : 0,
    minimumSamples: 5,
    timeZone: "UTC",
    strengths: [],
    concerns: [],
    evidence: [],
    latestDay: null,
    limitations: [
      "Comparisons use saved games on the same hero with durations within 25%; at least five valid samples per window.",
      "Role, rank, patch, mode and causes are unknown. Team results do not establish personal performance.",
    ],
  };
  if (!verified) {
    result.limitations.push(
      "Connect Steam and sync its saved history to see your own observations.",
    );
    return result;
  }
  const sorted = [...new Map(rows.map((r) => [String(r.matchId), r])).values()]
    .filter(
      (r) =>
        Number.isFinite(r.startedAt) &&
        r.startedAt >= 0 &&
        r.startedAt * 1000 <= now &&
        Number.isFinite(r.duration) &&
        r.duration > 0 &&
        r.heroId > 0,
    )
    .sort((a, b) => b.startedAt - a.startedAt || Number(b.matchId - a.matchId));
  result.retainedMatches = sorted.length;
  if (sorted[0]) {
    const date = new Date(sorted[0].startedAt * 1000)
      .toISOString()
      .slice(0, 10);
    const day = sorted.filter(
      (r) => new Date(r.startedAt * 1000).toISOString().slice(0, 10) === date,
    );
    const wins = day.filter((r) => r.result === "win").length,
      losses = day.filter((r) => r.result === "loss").length;
    result.latestDay = {
      date,
      games: day.length,
      wins,
      losses,
      unknown: day.length - wins - losses,
      reflection:
        "Review one decision from your latest saved UTC day. Outcomes alone cannot explain what caused them; check a replay before changing your play.",
    };
  }
  const heroes = [...new Set(sorted.map((r) => r.heroId))];
  for (const heroId of heroes) {
    const hero = sorted.filter((r) => r.heroId === heroId),
      anchor = hero[0]!;
    const comparable = hero
      .filter(
        (r) =>
          r.duration >= anchor.duration * 0.75 &&
          r.duration <= anchor.duration * 1.25,
      )
      .slice(0, 10);
    if (comparable.length < 10) continue;
    for (const metric of metrics) {
      if (result.evidence.length >= 18) break;
      const windows = [comparable.slice(0, 5), comparable.slice(5, 10)];
      const values = windows.map((w) =>
        w
          .map((r) => r[metric])
          .filter(
            (v): v is number =>
              typeof v === "number" && Number.isFinite(v) && v >= 0,
          ),
      );
      if (values.some((v) => v.length < 5)) continue;
      const averages = values.map(
        (v) =>
          Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100,
      );
      const [current, previous] = averages as [number, number];
      if (current === previous) continue;
      const ids = windows.map(
        (w, i) => `hero.${heroId}.${metric}.${i === 0 ? "recent" : "prior"}`,
      );
      const improved =
        metric === "deaths" ? current < previous : current > previous;
      const bucket = improved ? result.strengths : result.concerns;
      if (bucket.length >= 3) continue;
      windows.forEach((w, i) =>
        result.evidence.push({
          id: ids[i]!,
          metric,
          value: averages[i]!,
          samples: 5,
          matchIds: w.map((r) => String(r.matchId)),
        }),
      );
      bucket.push({
        text: `Hero ${heroId}: ${metric} averaged ${current} in the latest five comparable saved games and ${previous} in the prior five. This is a personal sample, not proof of impact or cause.`,
        evidenceIds: ids,
      });
    }
  }
  return result;
}
/** Only finite controlled intents cross the AI boundary. The original may contain PII or prompt injection. */
export function questionForModel(input: FollowUpInput): string {
  if (input.questionId) return cannedQuestions[input.questionId];
  const q = input
    .question!.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (
    /why|cause|die|death|lost|lose|reason|por\s+que|causa|\bmori\b|morir|muert|\bperdi\b|perder|perdimos|razon/.test(
      q,
    )
  )
    return "What can the saved evidence establish about causes, and what needs replay verification?";
  if (
    /compar|average|baseline|previous|history|promedio|historial|anteriores/.test(
      q,
    )
  )
    return cannedQuestions.comparison;
  if (
    /replay|watch|check|fight|ward|item|position|repeticion|pelea|objetos|posicion/.test(
      q,
    )
  )
    return cannedQuestions.replay;
  return cannedQuestions.focus;
}
export function validateCoaching(
  value: unknown,
  evidence: CoachingInsights["evidence"],
) {
  const parsed = coachingOutputSchema.safeParse(value);
  if (!parsed.success)
    throw new CoachingError(
      "The coaching response could not be validated. Saved answers remain available.",
      502,
    );
  const out = parsed.data,
    known = new Map(evidence.map((e) => [e.id, e]));
  if (
    out.evidenceIds.some((id) => !known.has(id)) ||
    (!out.evidenceIds.length && !out.needsReplay)
  )
    throw new CoachingError(
      "The coaching response cited unavailable evidence.",
      502,
    );
  // Numerical prose is restricted to cited evidence values or sample counts.
  const allowed = new Set(
    out.evidenceIds.flatMap((id) => {
      const e = known.get(id)!;
      return [String(e.value), String(e.samples)];
    }),
  );
  if ((out.text.match(/\b\d+(?:\.\d+)?\b/g) ?? []).some((n) => !allowed.has(n)))
    throw new CoachingError(
      "The coaching response included unsupported numbers.",
      502,
    );
  if (/https?:|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(out.text))
    throw new CoachingError(
      "The coaching response included unsupported external information.",
      502,
    );
  return out;
}
