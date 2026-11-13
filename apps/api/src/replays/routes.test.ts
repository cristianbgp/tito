import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createApp } from "../app";
import { createAuth } from "../auth";
import { readConfig } from "../config";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { existingTestSession } from "../test-utils/session";
import { normalizeReplay } from "./normalize";
import { replayData } from "./test-fixtures";

let directory: string;
let database: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof createApp>;
let cookie: string, otherCookie: string;
const bytes = new TextEncoder().encode("PBDEMS2\0test-replay-bytes");
const headers = (value = cookie, origin = "http://localhost:5173") => ({
  Cookie: value,
  Origin: origin,
});
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "tito-replay-routes-"));
  database = await createTestDatabase(directory);
  const config = readConfig({ DATA_DIR: directory });
  const auth = createAuth(config, database.db);
  const own = await existingTestSession(auth, "owner@imports.invalid");
  cookie = own.cookie;
  otherCookie = (await existingTestSession(auth, "other@imports.invalid"))
    .cookie;
  await database.db
    .update(user)
    .set({ steamId: "76561197960265770" })
    .where(eq(user.id, own.original.user.id));
  app = createApp(
    config,
    auth,
    undefined,
    database.db,
    undefined,
    undefined,
    undefined,
    {
      available: true,
      parse: async () => normalizeReplay(replayData(), "42"),
    },
  );
});
afterAll(async () => {
  await database?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});
function begin(cookieValue = cookie, origin?: string, size = bytes.length) {
  return app.request("/api/replays/imports", {
    method: "POST",
    headers: {
      ...headers(cookieValue, origin),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ size, filename: "test.dem" }),
  });
}
it("requires linked identity and a trusted write origin before accepting uploads", async () => {
  expect((await begin("")).status).toBe(401);
  expect((await begin(otherCookie)).status).toBe(403);
  expect((await begin(cookie, "https://foreign.invalid")).status).toBe(403);
  expect((await begin(cookie, undefined, 300 * 1024 * 1024)).status).toBe(400);
});
it("uploads bounded chunks, keeps imports private and serves the completed lobby without OpenDota", async () => {
  const response = await begin();
  expect(response.status).toBe(201);
  const job = await response.json();
  expect(
    (
      await app.request(`/api/replays/imports/${job.id}`, {
        headers: headers(otherCookie),
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await app.request(`/api/replays/imports/${job.id}?offset=1`, {
        method: "PUT",
        headers: headers(),
        body: bytes,
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await app.request(`/api/replays/imports/${job.id}?offset=0`, {
        method: "PUT",
        headers: headers(),
        body: bytes,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await app.request(`/api/replays/imports/${job.id}/complete`, {
        method: "POST",
        headers: headers(),
      })
    ).status,
  ).toBe(202);
  let status;
  for (let i = 0; i < 100; i++) {
    status = await (
      await app.request(`/api/replays/imports/${job.id}`, {
        headers: headers(),
      })
    ).json();
    if (status.status !== "processing") break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(status).toMatchObject({ status: "complete", matchId: "900" });
  const detail = await app.request("/api/matches/900", { headers: headers() });
  expect(detail.status).toBe(200);
  expect(detail.headers.get("Cache-Control")).toContain("no-store");
  expect(await detail.json()).toMatchObject({ source: "replay", lobbyType: 1 });
  const history = await app.request("/api/history", { headers: headers() });
  expect(await history.json()).toMatchObject({
    total: 1,
    matches: [{ source: "replay", id: "900" }],
  });
  expect((await readdir(join(directory, "replay-uploads"))).length).toBe(0);
});
