import { expect, it, vi } from "vitest";
import { OpenAIReviewModel, estimateCost, reserveCost } from "./provider";
import { buildReviewContext } from "./context";
import { detail, validReview } from "./test-fixtures";

const context = () => buildReviewContext("42", detail(), undefined, []);
const response = (fields: Record<string, unknown> = {}) =>
  Response.json({
    status: "completed",
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify(validReview()) }],
      },
    ],
    usage: { input_tokens: 1500, output_tokens: 400 },
    ...fields,
  });
it("sends only bounded evidence with strict JSON, no storage/tools/retries and validates structured output", async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(response());
  const result = await new OpenAIReviewModel("test-key", request).generate(
    context(),
    "gpt-5.4-mini-2026-03-17",
  );
  expect(result.content).toEqual(validReview());
  expect(result.usage).toEqual({ input: 1500, output: 400 });
  const [url, init] = request.mock.calls[0];
  expect(url).toBe("https://api.openai.com/v1/responses");
  const body = JSON.parse(String(init?.body));
  expect(body).toMatchObject({
    store: false,
    max_output_tokens: 1800,
    reasoning: { effort: "none" },
    text: { format: { type: "json_schema", strict: true } },
  });
  expect(body.tools).toBeUndefined();
  expect(body.input).not.toMatch(/PRIVATE NAME|accountId|test-key/);
});
it("rejects incomplete/refused/invalid output, redacts upstream errors, and never retries", async () => {
  for (const reply of [
    response({ status: "incomplete" }),
    response({
      output: [
        { type: "message", content: [{ type: "refusal", refusal: "no" }] },
      ],
    }),
    response({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: '{"bad":true}' }],
        },
      ],
    }),
    new Response("SECRET KEY", { status: 429 }),
  ]) {
    const request = vi.fn<typeof fetch>().mockResolvedValue(reply);
    await expect(
      new OpenAIReviewModel("secret", request).generate(
        context(),
        "gpt-5.4-mini-2026-03-17",
      ),
    ).rejects.not.toThrow(/SECRET KEY|secret/);
    expect(request).toHaveBeenCalledTimes(1);
  }
});
it("reserves more than measured cost, including output and conservative price margins", () => {
  const model = "gpt-5.4-mini-2026-03-17";
  expect(estimateCost(model, { input: 1000, output: 1000 })).toBe(5982);
  expect(reserveCost(context(), model)).toBeGreaterThan(
    estimateCost(model, { input: 1500, output: 1800 }),
  );
});

it("uses fixed Spanish instructions for Spanish reviews and English by default", async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => response());
  const model = new OpenAIReviewModel("test-key", request);
  await model.generate(context(), "gpt-5.4-mini-2026-03-17", "es");
  await model.generate(context(), "gpt-5.4-mini-2026-03-17");
  const bodies = request.mock.calls.map(([, init]) =>
    JSON.parse(String(init?.body)),
  );
  expect(bodies[0].instructions).toContain(
    "Write all user-facing prose in Spanish",
  );
  expect(bodies[0].instructions).not.toContain("friendly English");
  expect(bodies[0].instructions).toContain(
    "Use a decimal point and no digit grouping",
  );
  expect(bodies[1].instructions).toContain(
    "Write all user-facing prose in English",
  );
  expect(bodies[0].input).toBe(bodies[1].input);
});

it("supplies readable clocks while preserving raw evidence and normalizes raw-second prose", async () => {
  const content = validReview();
  content.summary = "Review the change at 1600s and after 3750 seconds.";
  const request = vi.fn<typeof fetch>().mockResolvedValue(
    response({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(content) }],
        },
      ],
    }),
  );
  const supplied = context();
  supplied.facts.push({
    id: "match.teamGoldAdvantage.1600",
    metric: "teamGoldAdvantage",
    value: -5000,
    source: "match",
    samples: 1,
    atSeconds: 1600,
  });
  const result = await new OpenAIReviewModel("test-key", request).generate(
    supplied,
    "gpt-5.4-mini-2026-03-17",
  );
  expect(result.content.summary).toBe(
    "Review the change at 26:40 and after 1:02:30.",
  );
  const body = JSON.parse(String(request.mock.calls[0][1]?.body));
  const input = JSON.parse(body.input);
  expect(input.facts).toContainEqual(
    expect.objectContaining({
      id: "match.teamGoldAdvantage.1600",
      atSeconds: 1600,
      displayTime: "26:40",
    }),
  );
  expect(
    input.facts.find((fact: { metric: string }) => fact.metric === "duration")
      .displayValue,
  ).toBe("30:00");
  expect(supplied.facts.at(-1)?.atSeconds).toBe(1600);
});
