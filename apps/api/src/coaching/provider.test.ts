import { expect, test } from "vitest";
import {
  coachingBody,
  OpenAICoachingModel,
  reserveCoachingCost,
} from "./provider";
const context = {
  kind: "summary" as const,
  question: null,
  coverage: "summary",
  evidence: [
    {
      id: "x",
      metric: "deaths" as const,
      value: 0,
      samples: 5,
      matchIds: ["123"],
    },
  ],
};
test("bounded Responses body uses configured model, strict schema, no storage/tools and no identifiers", () => {
  const b = coachingBody(context, "gpt-5.4-mini-2026-03-17");
  expect(b.store).toBe(false);
  expect(b.max_output_tokens).toBe(1200);
  expect(b.text.format.strict).toBe(true);
  expect(JSON.stringify(b.input)).not.toContain("123");
  expect(
    reserveCoachingCost(context, "gpt-5.4-mini-2026-03-17"),
  ).toBeGreaterThan(5000);
  expect(() =>
    coachingBody(
      { ...context, coverage: "a".repeat(17000) },
      "gpt-5.4-mini-2026-03-17",
    ),
  ).toThrow();
});
test("no retries; rejects refusals and invalid evidence", async () => {
  let calls = 0;
  const model = new OpenAICoachingModel("test", async () => {
    calls++;
    return Response.json({
      status: "completed",
      output: [{ type: "message", content: [{ type: "refusal", text: "No" }] }],
    });
  });
  await expect(
    model.generate(context, "gpt-5.4-mini-2026-03-17"),
  ).rejects.toThrow();
  expect(calls).toBe(1);
  const valid = new OpenAICoachingModel("test", async () =>
    Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                text: "Check the replay for causes.",
                evidenceIds: ["x"],
                needsReplay: true,
              }),
            },
          ],
        },
      ],
      usage: { input_tokens: 100, output_tokens: 30 },
    }),
  );
  expect(
    (await valid.generate(context, "gpt-5.4-mini-2026-03-17")).usage?.input,
  ).toBe(100);
});

test("coaching instructions select fixed Spanish or English copy", () => {
  const es = coachingBody(context, "gpt-5.4-mini-2026-03-17", "es");
  const en = coachingBody(context, "gpt-5.4-mini-2026-03-17");
  expect(es.instructions).toContain("Write all user-facing prose in Spanish");
  expect(es.instructions).not.toContain("friendly English");
  expect(es.instructions).toContain(
    "Use a decimal point and no digit grouping",
  );
  expect(en.instructions).toContain("Write all user-facing prose in English");
  expect(es.input).toBe(en.input);
});
