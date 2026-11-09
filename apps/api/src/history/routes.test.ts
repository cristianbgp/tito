import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { readConfig } from "../config";
import { createApp } from "../app";
import { OpenDota } from "../dota/opendota";
import type { Auth } from "../auth";
import { playerMatch } from "./schema";

let directory: string;
let database: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof createApp>;
const upstream = vi.fn(async (url: string) =>
  Response.json(
    url.includes("/heroes")
      ? {}
      : [
          {
            match_id: 9,
            hero_id: 1,
            player_slot: 0,
            radiant_win: true,
            start_time: 1700000000,
            duration: 1800,
          },
        ],
  ),
);
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "tito-history-routes-"));
  database = await createTestDatabase(directory);
  await database.db.insert(user).values([
    { id: "linked", name: "Linked", email: "linked@history.invalid" },
    { id: "manual", name: "Manual", email: "manual@history.invalid" },
  ]);
  const auth = {
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const id = headers.get("Cookie");
        return id === "linked" || id === "manual"
          ? {
              user: {
                id,
                steamId: id === "linked" ? "76561197960265770" : null,
              },
            }
          : null;
      },
    },
  } as unknown as Auth;
  app = createApp(
    readConfig({}),
    auth,
    new OpenDota(undefined, upstream),
    database.db,
  );
});
afterAll(async () => {
  await database?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});
function sync(
  cookie: string,
  body: unknown = { mode: "latest" },
  origin = "http://localhost:5173",
) {
  return app.request("/api/history/sync", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
it("requires verified Steam ownership and trusted writes, never client-supplied ownership", async () => {
  expect((await app.request("/api/history/progress")).status).toBe(401);
  expect(
    (
      await app.request("/api/history/progress", {
        headers: { Cookie: "manual" },
      })
    ).status,
  ).toBe(403);
  expect((await app.request("/api/history")).status).toBe(401);
  expect((await sync("")).status).toBe(401);
  expect(
    (await app.request("/api/history", { headers: { Cookie: "manual" } }))
      .status,
  ).toBe(403);
  expect((await sync("manual")).status).toBe(403);
  expect(
    (await sync("linked", { mode: "latest" }, "https://foreign.invalid"))
      .status,
  ).toBe(403);
  expect(
    (await sync("linked", { mode: "latest", accountId: "99" })).status,
  ).toBe(400);
  expect(
    (
      await app.request("/api/history?limit=1001", {
        headers: { Cookie: "linked" },
      })
    ).status,
  ).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});
it("reads saved rows without provider traffic and keeps public lookups temporary", async () => {
  const before = await app.request("/api/history", {
    headers: { Cookie: "linked" },
  });
  expect(await before.json()).toMatchObject({
    accountId: "42",
    matches: [],
    total: 0,
  });
  expect(upstream).not.toHaveBeenCalled();
  const imported = await sync("linked");
  expect(imported.status).toBe(200);
  expect(await imported.json()).toMatchObject({ accountId: "42", total: 1 });
  const calls = upstream.mock.calls.length;
  const saved = await app.request("/api/history", {
    headers: { Cookie: "linked" },
  });
  expect(saved.headers.get("cache-control")).toContain("no-store");
  expect(await saved.json()).toMatchObject({ accountId: "42", total: 1 });
  expect(upstream.mock.calls.length).toBe(calls);
  const progress = await app.request("/api/history/progress?accountId=99", {
    headers: { Cookie: "linked" },
  });
  expect(progress.status).toBe(200);
  expect(progress.headers.get("cache-control")).toContain("no-store");
  expect(await progress.json()).toMatchObject({
    accountId: "42",
    retainedMatches: 1,
    timeZone: "UTC",
  });
  expect(upstream.mock.calls.length).toBe(calls);
  const limited = await sync("linked");
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  expect((await app.request("/api/players/99/matches")).status).toBe(200);
  expect(await database.db.select().from(playerMatch)).toHaveLength(1);
});
