import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { readConfig } from "../config";
import { createApp } from "../app";
import type { Auth } from "../auth";
import type { DraftModel } from "./provider";
let dir: string;
let database: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof createApp>;
const auth = {
  api: {
    getSession: async ({ headers }: { headers: Headers }) =>
      headers.get("Cookie") === "user"
        ? { user: { id: "user", steamId: null } }
        : null,
  },
} as unknown as Auth;
const evaluate = vi.fn<DraftModel["evaluate"]>(async (c) => ({
  ratings: c.candidates.map((h) => ({
    id: h.id,
    fit: 2.5,
    confidence: 0.6,
    reason: "role_fit",
    tradeoff: "limited_information",
  })),
}));
const body = () => ({
  role: "5",
  allies: [1],
  enemies: [2],
  bans: [],
  pool: [5, 20],
  useHistory: true,
});
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tito-draft-routes-"));
  database = await createTestDatabase(dir);
  await database.db.insert(user).values({
    id: "user",
    name: "Test",
    email: "draft-routes@fixture.invalid",
  });
  app = createApp(
    readConfig({ OPENAI_API_KEY: "controlled" }),
    auth,
    undefined,
    database.db,
    undefined,
    { evaluate },
  );
});
afterAll(async () => {
  await database?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});
const post = (
  data: unknown = body(),
  cookie = "user",
  origin = "http://localhost:5173",
) =>
  app.request("/api/tools/hero-picker/suggest", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
it("serves the bundled portrait catalog without authentication or upstream traffic", async () => {
  const result = await app.request("/api/tools/hero-picker");
  expect(result.status).toBe(200);
  const catalog = await result.json();
  expect(catalog.heroes.length).toBeGreaterThan(100);
  expect(catalog.source).toBe("bundled");
  expect(catalog.enabled).toBe(true);
  expect(evaluate).not.toHaveBeenCalled();
});
it("requires signed-in trusted writes and rejects duplicate/forged IDs", async () => {
  expect((await post(body(), "")).status).toBe(401);
  expect((await post(body(), "user", "https://foreign.invalid")).status).toBe(
    403,
  );
  expect((await post({ ...body(), userId: "forged" })).status).toBe(400);
  expect((await post({ ...body(), allies: [2], enemies: [2] })).status).toBe(
    400,
  );
  expect((await post({ ...body(), bans: [9999] })).status).toBe(400);
  expect(evaluate).not.toHaveBeenCalled();
});
it("allows an email-only account to get private suggestions without claiming Steam personalization", async () => {
  const result = await post();
  expect(result.status).toBe(200);
  expect(result.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await result.json()).toMatchObject({
    personalized: false,
    historyGames: 0,
    evaluatedHeroes: 16,
  });
  expect(evaluate).toHaveBeenCalledTimes(1);
});
it("keeps the catalog available without a model key and fails before paid work", async () => {
  const disabled = createApp(readConfig({}), auth, undefined, database.db);
  const catalog = await disabled.request("/api/tools/hero-picker");
  expect(await catalog.json()).toMatchObject({ enabled: false });
  const result = await disabled.request("/api/tools/hero-picker/suggest", {
    method: "POST",
    headers: {
      Cookie: "user",
      Origin: "http://localhost:5173",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body()),
  });
  expect(result.status).toBe(503);
  expect(evaluate).not.toHaveBeenCalled();
});
