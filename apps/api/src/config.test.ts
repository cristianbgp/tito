import { describe, expect, it } from "vitest";
import { readConfig } from "./config";

describe("application configuration", () => {
  it("keeps AI optional with conservative limits and rejects unpriced models", () => {
    expect(readConfig({})).toMatchObject({
      openaiApiKey: undefined,
      reviewModel: "gpt-5.4-mini-2026-03-17",
      reviewDailyBudgetCents: 50,
      reviewMonthlyBudgetCents: 500,
      reviewUserDailyLimit: 5,
      reviewRetention: 100,
    });
    for (const input of [
      { OPENAI_REVIEW_MODEL: "unknown" },
      { AI_REVIEW_DAILY_BUDGET_CENTS: "-1" },
      { AI_REVIEW_USER_DAILY_LIMIT: "0" },
      { AI_REVIEW_RETENTION: "10000" },
    ])
      expect(() => readConfig(input)).toThrow();
  });
  it("validates cost controls with bounded defaults", () => {
    expect(readConfig({})).toMatchObject({
      historyMaxMatches: 1000,
      historyCooldownSeconds: 60,
      openDotaDailyRequestLimit: 1000,
    });
    for (const input of [
      { HISTORY_MAX_MATCHES: "0" },
      { HISTORY_MAX_MATCHES: "1001" },
      { HISTORY_SYNC_COOLDOWN_SECONDS: "1" },
      { OPENDOTA_DAILY_REQUEST_LIMIT: "0" },
      { OPENDOTA_DAILY_REQUEST_LIMIT: "100001" },
    ])
      expect(() => readConfig(input)).toThrow();
  });
  it("keeps email local when provider keys are absent", () => {
    const config = readConfig({});
    expect(config.emailTransport).toBe("local");
    expect(config.databaseUrl).toBeUndefined();
    expect(config.webUrl).toBe("http://localhost:5173");
    expect(config.port).toBe(3001);
  });

  it("accepts named local URLs and a Portless-assigned port", () => {
    const config = readConfig({
      WEB_URL: "https://tito.localhost",
      PORT: "4123",
    });
    expect(config.webUrl).toBe("https://tito.localhost");
    expect(config.port).toBe(4123);
  });

  it("rejects local email and embedded database defaults in production", () => {
    expect(() => readConfig({ NODE_ENV: "production" })).toThrow();
  });

  it("requires an API key when Resend is explicitly selected", () => {
    expect(() => readConfig({ EMAIL_TRANSPORT: "resend" })).toThrow(
      /RESEND_API_KEY/,
    );
  });

  it("rejects invalid ports and remote URLs for the local inbox", () => {
    expect(() => readConfig({ PORT: "banana" })).toThrow();
    expect(() => readConfig({ WEB_URL: "https://example.com" })).toThrow(
      /local/i,
    );
  });

  it("accepts an explicit production setup and rejects the known development secret", () => {
    const env = {
      NODE_ENV: "production",
      WEB_URL: "https://tito.example.com",
      DATABASE_URL: "postgres://user:password@localhost/tito",
      BETTER_AUTH_SECRET: "production-secret-with-at-least-32-characters",
      EMAIL_TRANSPORT: "resend",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "Tito <coach@example.com>",
    };
    expect(readConfig(env).production).toBe(true);
    expect(() => readConfig({ ...env, EMAIL_TRANSPORT: "local" })).toThrow();
    expect(() =>
      readConfig({ ...env, BETTER_AUTH_SECRET: readConfig({}).authSecret }),
    ).toThrow();
  });
});
