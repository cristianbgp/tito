import { expect, test, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { registerCoachingRoutes } from "./routes";
import { CoachingService } from "./service";
import type { Database } from "../db";
import { readConfig } from "../config";
import type { Auth } from "../auth";
import type { OpenDota } from "../dota/opendota";
const session = vi.fn(async () => null as unknown);
const app = () => {
  const a = new OpenAPIHono();
  registerCoachingRoutes(
    a,
    readConfig({}),
    { api: { getSession: session } } as unknown as Auth,
    {} as OpenDota,
  );
  return a;
};
test("requires session and exact origin, unlinked follow-up rejects before storage", async () => {
  expect((await app().request("/api/me/coaching")).status).toBe(401);
  session.mockResolvedValue({ user: { id: "one", steamId: null } });
  expect(
    (
      await app().request("/api/me/coaching/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.invalid",
        },
        body: "{}",
      })
    ).status,
  ).toBe(403);
  expect((await app().request("/api/matches/100/follow-up")).status).toBe(403);
  expect((await app().request("/api/me/coaching")).status).toBe(503);
});
test("rejects oversized or multiple question inputs before any generation", async () => {
  for (const body of [
    { question: "x".repeat(501) },
    { question: "x", questionId: "focus" },
    {},
  ]) {
    expect(
      (
        await app().request("/api/matches/100/follow-up", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:5173",
          },
          body: JSON.stringify(body),
        })
      ).status,
    ).toBe(400);
  }
});

test("generation routes pass negotiated Accept-Language to summary and follow-up services", async () => {
  session.mockResolvedValue({
    user: { id: "one", steamId: "76561197960265770" },
  });
  const summarize = vi
    .spyOn(CoachingService.prototype, "summarize")
    .mockResolvedValue({ enabled: true } as never);
  const followUp = vi
    .spyOn(CoachingService.prototype, "followUp")
    .mockResolvedValue({ enabled: true } as never);
  const a = new OpenAPIHono();
  registerCoachingRoutes(
    a,
    readConfig({}),
    { api: { getSession: session } } as unknown as Auth,
    {} as OpenDota,
    {} as Database,
  );
  try {
    for (const [path, body] of [
      ["/api/me/coaching/summary", {}],
      ["/api/matches/100/follow-up", { questionId: "focus" }],
    ] as const) {
      const response = await a.request(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
          "Accept-Language": "es-PE,en;q=0.8",
        },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(200);
    }
    expect(summarize).toHaveBeenCalledWith("one", "42", "es");
    expect(followUp).toHaveBeenCalledWith(
      "one",
      "42",
      "100",
      { questionId: "focus" },
      "es",
    );
  } finally {
    summarize.mockRestore();
    followUp.mockRestore();
  }
});
