import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createTestDatabase } from "./db/test-database";
import { readConfig } from "./config";
import { createAuth } from "./auth";
import { existingTestSession } from "./test-utils/session";

const steamEndpoint = "https://steamcommunity.com/openid/login";
const namespace = "http://specs.openid.net/auth/2.0";
const cookieHeader = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

describe("Steam authentication with Better Auth", () => {
  let dataDir: string;
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let auth: ReturnType<typeof createAuth>;
  let config: ReturnType<typeof readConfig>;
  let nonce = 0;

  beforeAll(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "tito-steam-"));
    config = readConfig({
      DATA_DIR: dataDir,
      WEB_URL: "https://tito.localhost",
      STEAM_API_KEY: "test-key",
    });
    database = await createTestDatabase(dataDir);
    auth = createAuth(config, database.db);
  });
  afterAll(async () => {
    await database?.close();
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  });
  beforeEach(() => {
    // Only Steam's external network boundary is simulated. State, cookies,
    // account ownership, sessions, and persistence use the real auth handlers.
    vi.stubGlobal(
      "fetch",
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );
        if (url.href === steamEndpoint) {
          expect(init?.method).toBe("POST");
          expect(
            new URLSearchParams(String(init?.body)).get("openid.mode"),
          ).toBe("check_authentication");
          return new Response(`ns:${namespace}\nis_valid:true\n`);
        }
        if (
          url.origin === "https://api.steampowered.com" &&
          url.pathname === "/ISteamUser/GetPlayerSummaries/v0002/"
        ) {
          return Response.json({
            response: {
              players: [
                {
                  steamid: url.searchParams.get("steamids"),
                  personaname: "Steam Player",
                  avatarfull: "https://example.com/avatar.jpg",
                  profileurl: "https://steamcommunity.com/",
                },
              ],
            },
          });
        }
        throw new Error(
          `Unexpected network request: ${url.origin}${url.pathname}`,
        );
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  async function begin(path = "login", sessionCookie = "") {
    const response = await auth.handler(
      new Request(`${config.webUrl}/api/auth/steam/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: config.webUrl,
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          callbackURL: "/account",
          errorCallbackURL: "/signin",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const { url } = await response.json();
    const authorizationURL = new URL(url);
    expect(authorizationURL.origin + authorizationURL.pathname).toBe(
      steamEndpoint,
    );
    expect(authorizationURL.searchParams.get("openid.realm")).toBe(
      config.webUrl,
    );
    const returnTo = authorizationURL.searchParams.get("openid.return_to")!;
    expect(new URL(returnTo).origin).toBe(config.webUrl);
    return { returnTo, cookie: cookieHeader(response) };
  }

  function complete(
    flow: Awaited<ReturnType<typeof begin>>,
    steamId: string,
    overrides: Record<string, string> = {},
  ) {
    const url = new URL(flow.returnTo);
    const identity = `https://steamcommunity.com/openid/id/${steamId}`;
    const fields = {
      "openid.ns": namespace,
      "openid.mode": "id_res",
      "openid.op_endpoint": steamEndpoint,
      "openid.return_to": flow.returnTo,
      "openid.claimed_id": identity,
      "openid.identity": identity,
      "openid.assoc_handle": "test-association",
      "openid.response_nonce":
        new Date().toISOString().replace(/\.\d{3}Z$/, "Z") + `test-${++nonce}`,
      "openid.signed":
        "op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
      "openid.sig": "dGVzdA==",
      ...overrides,
    };
    for (const [key, value] of Object.entries(fields))
      url.searchParams.set(key, value);
    return auth.handler(new Request(url, { headers: { Cookie: flow.cookie } }));
  }

  it("creates a persisted Steam account and signs back into the same user", async () => {
    const steamId = "76561198030654385";
    const response = await complete(await begin(), steamId);
    expect(response.status).toBe(302);
    expect(new URL(response.headers.get("location")!, config.webUrl).href).toBe(
      `${config.webUrl}/account`,
    );
    const session = await auth.api.getSession({
      headers: new Headers({ Cookie: cookieHeader(response) }),
    });
    expect(session?.user).toMatchObject({
      steamId,
      name: "Steam Player",
      isAdmin: false,
    });
    const restored = createAuth(config, database.db);
    expect(
      (
        await restored.api.getSession({
          headers: new Headers({ Cookie: cookieHeader(response) }),
        })
      )?.user.id,
    ).toBe(session?.user.id);
    await database.db.execute(
      sql`update "user" set is_admin = true where id = ${session!.user.id}`,
    );
    const next = await complete(await begin(), steamId);
    const returning = await auth.api.getSession({
      headers: new Headers({ Cookie: cookieHeader(next) }),
    });
    expect(returning?.user.id).toBe(session?.user.id);
    expect(returning?.user).toMatchObject({ isAdmin: true });
  });

  async function existingEmailAccount(email: string) {
    const { cookie, original } = await existingTestSession(auth, email);
    return { emailCookie: cookie, original };
  }

  it("links Steam to an existing account and preserves that owner on login", async () => {
    const email = "steam-link@example.com";
    const { emailCookie, original } = await existingEmailAccount(email);
    const steamId = "76561198030654386";
    const response = await complete(await begin("link", emailCookie), steamId);
    expect(response.status).toBe(302);
    expect(new URL(response.headers.get("location")!, config.webUrl).href).toBe(
      `${config.webUrl}/account`,
    );
    const signedIn = await complete(await begin(), steamId);
    const session = await auth.api.getSession({
      headers: new Headers({ Cookie: cookieHeader(signedIn) }),
    });
    expect(session?.user).toMatchObject({
      id: original.user.id,
      email,
      steamId,
    });
  });

  it("redirects a cancelled Steam flow to the configured error page", async () => {
    const response = await complete(await begin(), "76561198030654387", {
      "openid.mode": "cancel",
    });
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location")!, config.webUrl);
    expect(location.origin + location.pathname).toBe(`${config.webUrl}/signin`);
    expect(location.searchParams.get("error")).toBe(
      "STEAM_VERIFICATION_FAILED",
    );
  });

  it("rejects linking a Steam identity already owned by another user", async () => {
    const steamId = "76561198030654388";
    const ownerResponse = await complete(await begin(), steamId);
    const owner = await auth.api.getSession({
      headers: new Headers({ Cookie: cookieHeader(ownerResponse) }),
    });
    expect(owner?.user.steamId).toBe(steamId);
    const { emailCookie, original } = await existingEmailAccount(
      "other-owner@example.com",
    );
    const response = await complete(await begin("link", emailCookie), steamId);
    expect(response.status).toBe(302);
    expect(
      new URL(
        response.headers.get("location")!,
        config.webUrl,
      ).searchParams.get("error"),
    ).toBe("STEAM_ACCOUNT_ALREADY_LINKED");
    const unchanged = await auth.api.getSession({
      headers: new Headers({ Cookie: emailCookie }),
    });
    expect(unchanged?.user.id).toBe(original.user.id);
    expect(unchanged?.user.steamId).toBeNull();
  });

  it("requires the initiating browser's state cookie", async () => {
    const flow = await begin();
    const response = await complete(
      { ...flow, cookie: "" },
      "76561198030654389",
    );
    expect(response.status).toBe(302);
    expect(
      new URL(
        response.headers.get("location")!,
        config.webUrl,
      ).searchParams.get("error"),
    ).toBe("state_mismatch");
    expect(cookieHeader(response)).not.toContain("session_token");
  });

  it("rejects a tampered OpenID return URL", async () => {
    const response = await complete(await begin(), "76561198030654390", {
      "openid.return_to": "https://untrusted.example.com/callback",
    });
    expect(response.status).toBe(302);
    expect(
      new URL(
        response.headers.get("location")!,
        config.webUrl,
      ).searchParams.get("error"),
    ).toBe("STEAM_VERIFICATION_FAILED");
    expect(cookieHeader(response)).not.toContain("session_token");
  });

  it("consumes callback state only once", async () => {
    const flow = await begin();
    const response = await complete(flow, "76561198030654391");
    expect(cookieHeader(response)).toContain("session_token");
    const replay = await complete(flow, "76561198030654391");
    expect(replay.status).toBe(302);
    expect(
      new URL(replay.headers.get("location")!, config.webUrl).searchParams.has(
        "error",
      ),
    ).toBe(true);
    expect(cookieHeader(replay)).not.toContain("session_token");
  });
});
