import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { createApp } from "../app";
import { readConfig } from "../config";
import type { Auth } from "../auth";
import { OpenDota } from "../dota/opendota";
import { detail, validReview } from "./test-fixtures";
let dir: string;
let database: Awaited<ReturnType<typeof createTestDatabase>>;
const source = new OpenDota();
const match = vi
  .spyOn(source, "match")
  .mockImplementation(async () => detail());
const generate = vi.fn(async () => ({ content: validReview() }));
const auth = {
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      const id = headers.get("Cookie");
      return id === "linked" || id === "manual"
        ? {
            user: { id, steamId: id === "linked" ? "76561197960265770" : null },
          }
        : null;
    },
  },
} as unknown as Auth;
let app: ReturnType<typeof createApp>;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tito-review-routes-"));
  database = await createTestDatabase(dir);
  await database.db.insert(user).values(
    ["linked", "manual"].map((id) => ({
      id,
      name: id,
      email: `${id}@routes.invalid`,
    })),
  );
  app = createApp(
    readConfig({ OPENAI_API_KEY: "test" }),
    auth,
    source,
    database.db,
    { generate },
  );
});
afterAll(async () => {
  await database?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});
const post = (
  cookie = "linked",
  body: unknown = {},
  origin = "http://localhost:5173",
) =>
  app.request("/api/matches/900/review", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
      "Accept-Language": "es-PE,en;q=0.8",
    },
    body: JSON.stringify(body),
  });
it("requires a session, verified Steam and trusted Origin; rejects forged ownership", async () => {
  expect((await app.request("/api/matches/900/review")).status).toBe(401);
  expect((await post("")).status).toBe(401);
  expect((await post("manual")).status).toBe(403);
  expect((await post("linked", {}, "https://foreign.invalid")).status).toBe(
    403,
  );
  expect((await post("linked", { accountId: "99" })).status).toBe(400);
  expect((await app.request("/api/matches/0/review")).status).toBe(400);
  expect(match).not.toHaveBeenCalled();
  expect(generate).not.toHaveBeenCalled();
});
it("generates once and reads privately with no provider traffic", async () => {
  const result = await post();
  expect(result.status).toBe(200);
  expect(generate).toHaveBeenCalledTimes(1);
  expect(generate).toHaveBeenLastCalledWith(
    expect.anything(),
    "gpt-5.4-mini-2026-03-17",
    "es",
  );
  const before = match.mock.calls.length;
  const get = await app.request("/api/matches/900/review", {
    headers: { Cookie: "linked" },
  });
  expect(get.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await get.json()).toMatchObject({
    enabled: true,
    review: { content: validReview(), locale: "es" },
  });
  expect(match).toHaveBeenCalledTimes(before);
});
it("reports missing configuration without calling either provider, while retaining the saved review", async () => {
  const disabled = createApp(readConfig({}), auth, source, database.db);
  const get = await disabled.request("/api/matches/900/review", {
    headers: { Cookie: "linked" },
  });
  expect(await get.json()).toMatchObject({
    enabled: false,
    review: { content: validReview(), locale: "es" },
  });
  const result = await disabled.request("/api/matches/900/review", {
    method: "POST",
    headers: {
      Cookie: "linked",
      Origin: "http://localhost:5173",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  expect(result.status).toBe(503);
  expect(match).not.toHaveBeenCalled();
  expect(generate).not.toHaveBeenCalled();
});
