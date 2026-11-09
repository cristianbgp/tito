import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestDatabase } from "./db/test-database";
import { readConfig } from "./config";
import { createAuth } from "./auth";
import { createMailer, listLocalEmails } from "./email";

describe("real account creation", () => {
  it("delivers a magic link locally, creates a persisted account, and rejects token reuse", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "tito-auth-"));
    const config = readConfig({ DATA_DIR: dataDir });
    const database = await createTestDatabase(dataDir);
    try {
      const auth = createAuth(config, database.db, createMailer(config));
      const response = await auth.handler(
        new Request("http://localhost:5173/api/auth/sign-in/magic-link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: config.webUrl,
            "Accept-Language": "es-PE,en;q=0.8",
          },
          body: JSON.stringify({
            email: "player@example.com",
            name: "Test Player",
            callbackURL: `${config.webUrl}/`,
          }),
        }),
      );
      expect(response.status).toBe(200);
      const [message] = await listLocalEmails(dataDir);
      expect(message.subject).toBe("Tu enlace para iniciar sesión en Tito");
      expect(message.html).toContain('lang="es"');
      const url = message.html
        .match(/href="([^"]*magic-link\/verify[^"]*)"/)?.[1]
        ?.replaceAll("&amp;", "&");
      expect(url).toBeTruthy();
      const verified = await auth.handler(new Request(url!));
      expect(verified.status).toBe(302);
      const cookies = verified.headers.get("set-cookie");
      expect(cookies).toContain("session_token");
      const session = await auth.api.getSession({
        headers: new Headers({ cookie: cookies! }),
      });
      expect(session?.user.email).toBe("player@example.com");
      expect(session?.user.locale).toBe("en");
      const reused = await auth.handler(new Request(url!));
      expect(reused.headers.get("location")).toContain("error=");
      await database.close();
      const reopened = await createTestDatabase(dataDir);
      try {
        const restored = createAuth(config, reopened.db, createMailer(config));
        expect(
          (
            await restored.api.getSession({
              headers: new Headers({ cookie: cookies! }),
            })
          )?.user.email,
        ).toBe("player@example.com");
      } finally {
        await reopened.close();
      }
    } finally {
      await database.close().catch(() => {});
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
