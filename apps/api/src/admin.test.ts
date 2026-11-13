import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createAuth } from "./auth";
import { readConfig } from "./config";
import { createTestDatabase } from "./db/test-database";
import { existingTestSession } from "./test-utils/session";

describe("database-managed admin users", () => {
  let dataDir: string;
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let auth: ReturnType<typeof createAuth>;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "tito-admin-"));
    const config = readConfig({ DATA_DIR: dataDir });
    database = await createTestDatabase(dataDir);
    auth = createAuth(config, database.db);
    app = createApp(config, auth, undefined, database.db);
  });

  afterAll(async () => {
    await database?.close();
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  });

  async function session(cookie: string) {
    const response = await app.request("/api/auth/get-session", {
      headers: { Cookie: cookie },
    });
    expect(response.status).toBe(200);
    return response.json();
  }

  function updateUser(cookie: string, body: unknown) {
    return app.request("/api/auth/update-user", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "http://localhost:5173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("defaults to non-admin and reflects database promotion and revocation in an existing session", async () => {
    const { cookie, original } = await existingTestSession(
      auth,
      "admin-check@example.com",
    );
    const other = await existingTestSession(auth, "other-player@example.com");
    expect((await session(cookie)).user.isAdmin).toBe(false);

    await database.db.execute(
      sql`update "user" set is_admin = true where id = ${original.user.id}`,
    );
    expect((await session(cookie)).user.isAdmin).toBe(true);
    expect((await session(other.cookie)).user.isAdmin).toBe(false);

    // A normal account update must preserve a database-assigned admin flag.
    expect((await updateUser(cookie, { name: "Updated Player" })).status).toBe(
      200,
    );
    expect((await session(cookie)).user).toMatchObject({
      name: "Updated Player",
      isAdmin: true,
    });

    await database.db.execute(
      sql`update "user" set is_admin = false where id = ${original.user.id}`,
    );
    expect((await session(cookie)).user.isAdmin).toBe(false);
  });

  it("blocks client attempts to grant admin status through account updates", async () => {
    const { cookie } = await existingTestSession(
      auth,
      "unprivileged@example.com",
    );
    expect(
      (await updateUser(cookie, { name: "Trying Admin", isAdmin: true }))
        .status,
    ).toBe(400);
    expect((await session(cookie)).user.isAdmin).toBe(false);

    expect(
      (
        await updateUser(cookie, {
          name: "Regular Player",
          is_admin: true,
          role: "admin",
        })
      ).status,
    ).toBe(200);
    expect((await session(cookie)).user).toMatchObject({
      name: "Regular Player",
      isAdmin: false,
    });
  });
});
