import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, expect, it } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { readConfig } from "../config";
import type { Auth } from "../auth";
import { registerLibraryRoutes } from "./routes";
let dir: string, database: Awaited<ReturnType<typeof createTestDatabase>>;
const auth = {
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      const id = headers.get("Cookie");
      return ["one", "two", "linked"].includes(id ?? "")
        ? {
            user: { id, steamId: id === "linked" ? "76561197960265770" : null },
          }
        : null;
    },
  },
} as unknown as Auth;
const makeApp = (storage = true) => {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) return c.json({ error: "Invalid input" }, 400);
    },
  });
  registerLibraryRoutes(
    app,
    readConfig({}),
    auth,
    storage ? database.db : undefined,
  );
  return app;
};
let app: ReturnType<typeof makeApp>;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tito-library-routes-"));
  database = await createTestDatabase(dir);
  await database.db.insert(user).values(
    ["one", "two", "linked"].map((id) => ({
      id,
      name: id,
      email: `${id}@lib-routes.invalid`,
      steamId: id === "linked" ? "76561197960265770" : null,
    })),
  );
  app = makeApp();
});
afterAll(async () => {
  await database?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});
const put = (cookie: string, data: unknown, origin?: string) =>
  app.request("/api/library/pools/5", {
    method: "PUT",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(data),
  });
it("requires authentication and an exact explicit Origin on every mutation", async () => {
  expect((await app.request("/api/library/pools")).status).toBe(401);
  expect((await put("one", { entries: [] })).status).toBe(403);
  expect(
    (await put("one", { entries: [] }, "https://foreign.invalid")).status,
  ).toBe(403);
  expect(
    (await put("one", { entries: [] }, "http://localhost:5173")).status,
  ).toBe(200);
  for (const [method, path] of [
    ["DELETE", "/api/library/notes/900"],
    ["DELETE", "/api/library/feedback/900"],
    ["DELETE", "/api/library/drafts/00000000-0000-4000-8000-000000000000"],
  ] as const) {
    expect(
      (await app.request(path, { method, headers: { Cookie: "linked" } }))
        .status,
    ).toBe(403);
  }
});
it("rejects forged identity and malformed heroes before saving; scopes reads to session", async () => {
  expect(
    (await put("one", { entries: [], userId: "two" }, "http://localhost:5173"))
      .status,
  ).toBe(400);
  expect(
    (
      await put(
        "one",
        { entries: [{ heroId: 9999, preference: "favorite" }] },
        "http://localhost:5173",
      )
    ).status,
  ).toBe(400);
  await put(
    "one",
    { entries: [{ heroId: 5, preference: "learning" }] },
    "http://localhost:5173",
  );
  const own = await app.request("/api/library/pools/5", {
    headers: { Cookie: "one" },
  });
  expect(own.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await own.json()).toMatchObject({ entries: [{ heroId: 5 }] });
  expect(
    await (
      await app.request("/api/library/pools/5", { headers: { Cookie: "two" } })
    ).json(),
  ).toMatchObject({ entries: [] });
});
it("does not accept manual profiles for match associations and fails clearly without storage", async () => {
  for (const path of ["notes", "heroes", "reflection"]) {
    const result = await app.request(`/api/library/${path}`, {
      headers: { Cookie: "one" },
    });
    expect(result.status).toBe(403);
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
  }
  const noStorage = await makeApp(false).request("/api/library/usage", {
    headers: { Cookie: "one" },
  });
  expect(noStorage.status).toBe(503);
});

it("clears own feedback only through authenticated Steam and trusted Origin", async () => {
  const path = "/api/library/feedback/900";
  expect(
    (
      await app.request(path, {
        method: "DELETE",
        headers: { Origin: "http://localhost:5173" },
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await app.request(path, {
        method: "DELETE",
        headers: { Cookie: "one", Origin: "http://localhost:5173" },
      })
    ).status,
  ).toBe(403);
  const result = await app.request(path, {
    method: "DELETE",
    headers: { Cookie: "linked", Origin: "http://localhost:5173" },
  });
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ deleted: true });
  expect(result.headers.get("Cache-Control")).toBe("private, no-store");
});
