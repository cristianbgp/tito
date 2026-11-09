import { expect, test } from "vitest";
import type { Auth } from "../auth";
import { createApp } from "../app";
import { readConfig, type Config } from "../config";
const config = readConfig({});
const auth = {
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      const id = headers.get("x-test-user");
      return id ? { user: { id } } : null;
    },
  },
  handler: async () => new Response(null, { status: 404 }),
} as unknown as Auth;
function app(overrides: Partial<Config> = {}) {
  return createApp({ ...config, ...overrides }, auth);
}
function setup(
  instance: ReturnType<typeof app>,
  user = "one",
  origin: string | null = config.webUrl,
) {
  return instance.request("/api/local/game-state/setup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(user ? { "x-test-user": user } : {}),
      ...(origin ? { origin } : {}),
    },
    body: "{}",
  });
}
function ingest(
  instance: ReturnType<typeof app>,
  body: unknown,
  origin?: string,
  url = "http://127.0.0.1:3001/api/local/gsi",
) {
  return instance.request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("local setup and status require authentication; setup also requires exact Origin", async () => {
  const instance = app();
  expect((await instance.request("/api/local/game-state")).status).toBe(401);
  expect((await setup(instance, "")).status).toBe(401);
  expect((await setup(instance, "one", null)).status).toBe(403);
  expect((await setup(instance, "one", "https://foreign.example")).status).toBe(
    403,
  );
  const created = await setup(instance);
  expect(created.status).toBe(200);
  expect(created.headers.get("cache-control")).toBe("private, no-store");
  const body = await created.json();
  expect(body.receiverUrl).toBe("http://127.0.0.1:3001/api/local/gsi");
  expect(body.configuration).toContain('"auth"');
  expect((await setup(instance)).status).toBe(429);
});
test("native ingest requires the token and local destination, rejects foreign browser Origins, and isolates user status", async () => {
  const instance = app();
  const created = await (await setup(instance)).json();
  const token = created.configuration.match(/"token" "([^"]+)"/)[1];
  const payload = {
    auth: { token },
    map: { matchid: "123" },
    hero: { id: 5 },
    player: { team_name: "radiant", steamid: "PRIVATE", name: "PRIVATE" },
    draft: { team2: { pick0_id: 5, pick1_id: 2 }, team3: { pick0_id: 1 } },
  };
  expect(
    (await ingest(instance, { ...payload, auth: { token: "a".repeat(43) } }))
      .status,
  ).toBe(403);
  expect(
    (await ingest(instance, payload, "https://foreign.example")).status,
  ).toBe(403);
  expect(
    (
      await ingest(
        instance,
        payload,
        undefined,
        "https://external.example/api/local/gsi",
      )
    ).status,
  ).toBe(403);
  const received = await ingest(instance, payload);
  expect(received.status).toBe(200);
  expect(received.headers.get("cache-control")).toBe("no-store");
  const status = await instance.request("/api/local/game-state", {
    headers: { "x-test-user": "one" },
  });
  expect(status.headers.get("cache-control")).toBe("private, no-store");
  const snapshot = await status.json();
  expect(snapshot).toMatchObject({
    configured: true,
    stale: false,
    matchId: "123",
    allies: [2],
    enemies: [1],
  });
  expect(JSON.stringify(snapshot)).not.toMatch(/PRIVATE|token|steamid/);
  const other = await (
    await instance.request("/api/local/game-state", {
      headers: { "x-test-user": "two" },
    })
  ).json();
  expect(other).toMatchObject({
    configured: false,
    matchId: null,
    allies: [],
    enemies: [],
  });
  expect(
    (
      await instance.request("http://127.0.0.1:3001/api/local/gsi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      })
    ).status,
  ).toBe(400);
  expect(
    (await ingest(instance, { ...payload, padding: "x".repeat(33000) })).status,
  ).toBe(413);
});
test("production and non-local environments cannot create connections or accept game payloads", async () => {
  for (const overrides of [
    { production: true, webUrl: "https://tito.example" },
    { webUrl: "https://tito.example" },
  ]) {
    const instance = app(overrides);
    expect((await setup(instance, "one", overrides.webUrl)).status).toBe(403);
    expect(
      (await ingest(instance, { auth: { token: "a".repeat(43) } })).status,
    ).toBe(404);
    const status = await instance.request("/api/local/game-state", {
      headers: { "x-test-user": "one" },
    });
    expect(await status.json()).toMatchObject({
      supported: false,
      configured: false,
    });
  }
});
