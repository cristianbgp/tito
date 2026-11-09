import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { readConfig } from "./config";
import type { Auth } from "./auth";

// These route tests do not enter auth handlers; the account integration test uses real Better Auth.
const auth = {
  handler: () => {
    throw new Error("Unexpected auth request");
  },
} as unknown as Auth;

describe("API exposure", () => {
  it("does not register the development inbox in production", async () => {
    const config = { ...readConfig({}), production: true };
    const response = await createApp(config, auth).request(
      "http://localhost/api/dev/emails",
    );
    expect(response.status).toBe(404);
  });

  it("does not expose local emails to non-local hosts", async () => {
    const response = await createApp(readConfig({}), auth).request(
      "https://example.com/api/dev/emails",
    );
    expect(response.status).toBe(404);
  });

  it("rejects malformed Dota IDs before contacting the upstream", async () => {
    const response = await createApp(readConfig({}), auth).request(
      "/api/players/invalid/matches",
    );
    expect(response.status).toBe(400);
  });

  it("keeps Steam unavailable until its server key is configured", async () => {
    const app = createApp(readConfig({}), auth);
    const response = await app.request("/api/auth/steam/login", {
      method: "POST",
    });
    expect(response.status).toBe(503);
    const config = await app.request("/api/config");
    expect(await config.json()).toMatchObject({
      steamEnabled: false,
      localInboxEnabled: true,
    });
  });
});
