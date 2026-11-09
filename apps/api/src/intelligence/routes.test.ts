import { expect, test } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { OpenDota } from "../dota/opendota";
import { readConfig } from "../config";
import type { Auth } from "../auth";
import { registerIntelligenceRoutes } from "./routes";
import { patchChangesSchema } from "./contracts";

test("requires browser revalidation of replay evidence while reusing the bounded upstream cache", async () => {
  let matchReads = 0;
  const dota = new OpenDota(undefined, async (input) => {
    if (new URL(input).pathname === "/api/matches/123") {
      matchReads++;
      return Response.json({
        match_id: 123,
        start_time: 1700000000,
        duration: 120,
        players: [{ hero_id: 1, player_slot: 0 }],
      });
    }
    return Response.json({});
  });
  const app = new OpenAPIHono();
  registerIntelligenceRoutes(app, readConfig({}), {} as Auth, dota);
  const first = await app.request("/api/intelligence/matches/123");
  expect(first.status).toBe(200);
  expect(first.headers.get("Cache-Control")).toBe("no-cache");
  expect((await first.json()).parsed).toBe(false);
  expect((await app.request("/api/intelligence/matches/123")).status).toBe(200);
  expect(matchReads).toBe(1);
});

test("public intelligence routes expose independent section errors and reject invalid identifiers before fetching", async () => {
  let calls = 0;
  const app = new OpenAPIHono();
  const dota = new OpenDota(undefined, async () => {
    calls++;
    return new Response(null, { status: 503 });
  });
  registerIntelligenceRoutes(app, readConfig({}), {} as Auth, dota);
  expect((await app.request("/api/intelligence/heroes/../bad")).status).toBe(
    404,
  );
  expect((await app.request("/api/intelligence/heroes/0")).status).toBe(400);
  expect(calls).toBe(0);
  const hero = await app.request("/api/intelligence/heroes/1");
  expect(hero.status).toBe(200);
  expect((await hero.json()).matchups.status).toBe("unavailable");
  expect(calls).toBe(5);
  expect(
    (await app.request("/api/intelligence/patches/7.41?heroIds=0")).status,
  ).toBe(400);
  const patch = await app.request("/api/intelligence/patches/7.41?heroIds=1,2");
  expect(patch.status).toBe(200);
  expect(patchChangesSchema.safeParse(await patch.json()).success).toBe(true);
  const match = await app.request("/api/intelligence/matches/123");
  expect(match.status).toBe(502);
});
