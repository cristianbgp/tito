import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { steamOpenID } from "better-auth-steam";
import type { Config } from "./config";
import type { Database } from "./db";
import * as schema from "./db/schema";

export function createAuth(config: Config, db: Database) {
  return betterAuth({
    appName: "Tito",
    baseURL: config.webUrl,
    secret: config.authSecret,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    trustedOrigins: [config.webUrl],
    account: { accountLinking: { enabled: true, allowDifferentEmails: true } },
    user: {
      additionalFields: {
        locale: { type: "string", defaultValue: "en", input: false },
        isAdmin: { type: "boolean", defaultValue: false, input: false },
      },
    },
    advanced: { useSecureCookies: config.webUrl.startsWith("https://") },
    plugins: [
      steamOpenID({
        apiKey: config.steamApiKey ?? "",
        syntheticEmailDomain: "steam.invalid",
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
