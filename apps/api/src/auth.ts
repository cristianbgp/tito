import { requestLocale } from "./i18n/locale";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { magicLink } from "better-auth/plugins/magic-link";
import { steamOpenID } from "better-auth-steam";
import type { Config } from "./config";
import type { Database } from "./db";
import type { createMailer } from "./email";
import * as schema from "./db/schema";

export function createAuth(
  config: Config,
  db: Database,
  mailer: ReturnType<typeof createMailer>,
) {
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
      },
    },
    advanced: { useSecureCookies: config.webUrl.startsWith("https://") },
    plugins: [
      magicLink({
        expiresIn: 600,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }, ctx) =>
          mailer.sendSignIn(
            email,
            url,
            requestLocale(ctx?.headers?.get("accept-language")),
          ),
      }),
      steamOpenID({
        apiKey: config.steamApiKey ?? "",
        syntheticEmailDomain: "steam.invalid",
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
