import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../db/test-database";
import { readConfig } from "../config";
import { createAuth } from "../auth";
import { createMailer, listLocalEmails } from "../email";
import { createApp } from "../app";
import { resolveProfile } from "./service";

describe("saved player preferences", () => {
  let dataDir: string;
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createApp>;
  let firstCookie: string;
  let secondCookie: string;

  beforeAll(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "tito-profile-"));
    const config = readConfig({ DATA_DIR: dataDir });
    database = await createTestDatabase(dataDir);
    const auth = createAuth(config, database.db, createMailer(config));
    app = createApp(config, auth, undefined, database.db);
    async function signIn(email: string) {
      const requested = await auth.handler(
        new Request(`${config.webUrl}/api/auth/sign-in/magic-link`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: config.webUrl,
          },
          body: JSON.stringify({
            email,
            name: "Profile Player",
            callbackURL: `${config.webUrl}/account`,
          }),
        }),
      );
      expect(requested.status).toBe(200);
      const message = (await listLocalEmails(dataDir)).find(
        (mail) => mail.to === email,
      )!;
      const url = message.html
        .match(/href="([^"]*magic-link\/verify[^"]*)"/)![1]
        .replaceAll("&amp;", "&");
      const response = await auth.handler(new Request(url));
      expect(response.status).toBe(302);
      return response.headers.get("set-cookie")!;
    }
    firstCookie = await signIn("first@example.com");
    secondCookie = await signIn("second@example.com");
  });

  afterAll(async () => {
    await database?.close();
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  });

  const request = (
    cookie: string,
    body: unknown,
    origin = "http://localhost:5173",
  ) =>
    app.request("/api/profile", {
      method: "PUT",
      headers: {
        Cookie: cookie,
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

  it("requires a session to read or save a profile", async () => {
    expect((await app.request("/api/profile")).status).toBe(401);
    expect(
      (await request("", { accountId: null, role: null, experience: null }))
        .status,
    ).toBe(401);
  });

  it("stores canonical account IDs and keeps each player's settings private", async () => {
    const saved = await request(firstCookie, {
      accountId: "76561198030654385",
      role: 4,
      experience: "beginner",
    });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({
      accountId: "70388657",
      role: 4,
      experience: "beginner",
      linkedAccountId: null,
    });
    const first = await app.request("/api/profile", {
      headers: { Cookie: firstCookie },
    });
    expect(await first.json()).toMatchObject({
      accountId: "70388657",
      role: 4,
      experience: "beginner",
    });
    expect(first.headers.get("cache-control")).toContain("no-store");
    const second = await app.request("/api/profile", {
      headers: { Cookie: secondCookie },
    });
    expect(await second.json()).toMatchObject({
      accountId: null,
      role: null,
      experience: null,
    });
  });

  it("rejects invalid IDs and unsupported roles without changing saved preferences", async () => {
    expect(
      (
        await request(firstCookie, {
          accountId: "4294967295",
          role: 4,
          experience: "beginner",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(firstCookie, {
          accountId: "70388657",
          role: 6,
          experience: "beginner",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(firstCookie, {
          accountId: "70388657",
          role: 4,
          experience: "expert",
        })
      ).status,
    ).toBe(400);
    const response = await app.request("/api/profile", {
      headers: { Cookie: firstCookie },
    });
    expect(await response.json()).toMatchObject({
      accountId: "70388657",
      role: 4,
      experience: "beginner",
    });
  });

  it("rejects foreign write origins and client-supplied ownership fields", async () => {
    expect(
      (
        await request(
          firstCookie,
          { accountId: "70388657", role: 1, experience: "advanced" },
          "https://untrusted.example.com",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(firstCookie, {
          accountId: "70388657",
          role: 1,
          experience: "advanced",
          userId: "someone-else",
        })
      ).status,
    ).toBe(400);
  });

  it("allows preferences to be cleared", async () => {
    const response = await request(firstCookie, {
      accountId: null,
      role: null,
      experience: null,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      accountId: null,
      role: null,
      experience: null,
    });
  });

  it("derives a default from verified Steam identity without verifying manual IDs", () => {
    expect(resolveProfile(undefined, "76561198030654385")).toEqual({
      accountId: "70388657",
      linkedAccountId: "70388657",
      role: null,
      experience: null,
    });
    expect(
      resolveProfile(
        { accountId: "123", role: 1, experience: "advanced" },
        "76561198030654385",
      ),
    ).toMatchObject({ accountId: "123", linkedAccountId: "70388657" });
    expect(
      resolveProfile({ accountId: "123", role: null, experience: null }, null),
    ).toMatchObject({ accountId: "123", linkedAccountId: null });
  });
});
