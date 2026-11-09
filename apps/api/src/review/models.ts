// Recheck official pricing before enabling live generation. Micro-USD per token.
// https://developers.openai.com/api/docs/models/gpt-5.4-mini
// https://developers.openai.com/api/docs/models/gpt-5.6-terra
export const reviewModels = [
  "gpt-5.4-mini-2026-03-17",
  "gpt-5.6-terra",
] as const;
export type ReviewModelId = (typeof reviewModels)[number];
export const prices = {
  "gpt-5.4-mini-2026-03-17": { input: 0.75, output: 4.5 },
  "gpt-5.6-terra": { input: 2, output: 12 },
} satisfies Record<ReviewModelId, { input: number; output: number }>;
