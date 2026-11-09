import { expect, it, vi } from "vitest";
import {
  DecisionsDraftModel,
  decisionBody,
  estimateDraftCost,
  reserveDraftCost,
} from "./provider";
import { buildDraftContext } from "./context";
import { heroCatalog } from "./catalog";
import { draftInputSchema } from "./contracts";
import { loadDraftEvidence } from "./evidence";
const context = () =>
  buildDraftContext(
    draftInputSchema.parse({
      role: "5",
      allies: [1],
      enemies: [2],
      bans: [],
      pool: [5, 20],
      useHistory: false,
    }),
    heroCatalog,
    [],
  );
export function decisionReply(
  ids = context().candidates.map((hero) => hero.id),
) {
  return {
    model: "gpt-6-luna",
    usage: { input_tokens: 2000 },
    answers: ids.flatMap((id) => [
      {
        type: "score",
        name: `fit_${id}`,
        score: 3,
        confidence: 0.8,
        probabilities: [0, 1, 2, 3, 4].map((value) => ({
          value,
          label: String(value),
          probability: value === 3 ? 1 : 0,
        })),
      },
      {
        type: "choice",
        name: `reason_${id}`,
        choice: "role_fit",
        confidence: 0.8,
        probabilities: [{ value: "role_fit", probability: 1 }],
      },
      {
        type: "choice",
        name: `tradeoff_${id}`,
        choice: "limited_information",
        confidence: 0.8,
        probabilities: [{ value: "limited_information", probability: 1 }],
      },
    ]),
  };
}
it("batches bounded independent scores and category choices with no writing call", async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(decisionReply()));
  const result = await new DecisionsDraftModel("fake", request).evaluate(
    context(),
  );
  expect(result.ratings).toHaveLength(context().candidates.length);
  expect(result.inputTokens).toBe(2000);
  const [url, init] = request.mock.calls[0];
  expect(url).toBe("https://api.openai.com/v1/decisions");
  const body = JSON.parse(String(init?.body));
  expect(body.questions).toHaveLength(context().candidates.length * 3);
  expect(body.model).toBe("gpt-6-luna");
  expect(body.max_output_tokens).toBeUndefined();
  expect(body.store).toBeUndefined();
  expect(JSON.stringify(body)).not.toMatch(/steamId|accountId|fake/);
  expect(reserveDraftCost(context())).toBeGreaterThan(estimateDraftCost(2000));
});
it("fits the widest shortlist and favorite alternatives in one bounded request", async () => {
  const base = context();
  const picks = {
    role: "5" as const,
    allies: [1, 2, 3, 4],
    enemies: [6, 7, 8, 9, 10],
    bans: [],
    pool: [],
    useHistory: false,
  };
  const general = buildDraftContext(
    draftInputSchema.parse(picks),
    heroCatalog,
    [],
  );
  const extraFavorites = heroCatalog
    .filter(
      (hero) =>
        ![
          ...picks.allies,
          ...picks.enemies,
          ...general.candidates.map((h) => h.id),
        ].includes(hero.id),
    )
    .slice(0, 4)
    .map((hero) => hero.id);
  const expanded = buildDraftContext(
    draftInputSchema.parse({
      ...picks,
      pool: extraFavorites,
    }),
    heroCatalog,
    [],
  );
  expanded.evidence = await loadDraftEvidence(
    {
      heroMatchups: async (id) => ({
        status: "available",
        data: expanded.candidates.map((hero) => ({
          heroId: hero.id,
          gamesPlayed: 999999999,
          wins: 123456789,
          winRate: 123456789 / 999999999,
        })),
        fetchedAt: "2026-11-08T00:00:00Z",
        expiresAt: "2026-11-08T01:00:00Z",
        sourceUrl: `https://www.opendota.com/heroes/${id}/matchups`,
      }),
    },
    picks.enemies,
    expanded.candidates.map((hero) => hero.id),
  );
  expect(expanded.evidence.matchups).toHaveLength(60);
  const body = decisionBody(expanded);
  expect(expanded.candidates).toHaveLength(20);
  expect(body.questions).toHaveLength(60);
  expect(
    new TextEncoder().encode(JSON.stringify(body)).byteLength,
  ).toBeLessThanOrEqual(49152);
  expect(reserveDraftCost(expanded)).toBeGreaterThan(reserveDraftCost(base));
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json(decisionReply(expanded.candidates.map((h) => h.id))),
    );
  const result = await new DecisionsDraftModel("fake", request).evaluate(
    expanded,
  );
  expect(result.ratings).toHaveLength(20);
  expect(request).toHaveBeenCalledTimes(1);
});
it("rejects refusals, missing/duplicate/unknown answers, invalid distributions and unknown options without retry", async () => {
  const good = decisionReply();
  const bad = [
    { ...good, answers: good.answers.slice(1) },
    { ...good, answers: [...good.answers, good.answers[0]] },
    {
      ...good,
      answers: [{ type: "refusal", name: "fit_5" }, ...good.answers.slice(1)],
    },
    {
      ...good,
      answers: good.answers.map((a, i) => (i === 0 ? { ...a, score: 999 } : a)),
    },
    {
      ...good,
      answers: good.answers.map((a, i) =>
        i === 1 ? { ...a, choice: "invented" } : a,
      ),
    },
    {
      ...good,
      answers: good.answers.map((a, i) =>
        i === 0 ? { ...a, probabilities: [{ value: 3, probability: 0.2 }] } : a,
      ),
    },
  ];
  for (const reply of bad) {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(reply));
    await expect(
      new DecisionsDraftModel("secret", request).evaluate(context()),
    ).rejects.toMatchObject({ status: 502 });
    expect(request).toHaveBeenCalledTimes(1);
  }
});
it("redacts network errors and timeout failures", async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new DOMException("secret provider URL", "TimeoutError"));
  await expect(
    new DecisionsDraftModel("secret", request).evaluate(context()),
  ).rejects.toThrow("The hero suggestions could not be completed");
  expect(request).toHaveBeenCalledTimes(1);
});
