import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createTestDatabase } from "./db/test-database";
import { readConfig } from "./config";
import { createAuth } from "./auth";
import { listLocalEmails } from "./email";

it("does not expose email sign-in or old magic-link verification endpoints", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "tito-auth-"));
  const config = readConfig({ DATA_DIR: dataDir, STEAM_API_KEY: "test-key" });
  const database = await createTestDatabase(dataDir);
  try {
    const auth = createAuth(config, database.db);
    const response = await auth.handler(
      new Request(`${config.webUrl}/api/auth/sign-in/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: config.webUrl },
        body: JSON.stringify({
          email: "player@example.com",
          callbackURL: "/account",
        }),
      }),
    );
    expect(response.status).toBe(404);
    const verify = await auth.handler(
      new Request(
        `${config.webUrl}/api/auth/magic-link/verify?token=old-token`,
      ),
    );
    expect(verify.status).toBe(404);
    expect(await listLocalEmails(dataDir)).toEqual([]);
  } finally {
    await database.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
