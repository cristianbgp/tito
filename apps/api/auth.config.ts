// CLI-only configuration. Does not connect to a real database or send email.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/pglite";
import { magicLink } from "better-auth/plugins/magic-link";
import { steamOpenID } from "better-auth-steam";

export const auth = betterAuth({
  baseURL: "http://localhost:5173",
  database: drizzleAdapter(drizzle(), { provider: "pg" }),
  user: {
    additionalFields: {
      locale: { type: "string", defaultValue: "en", input: false },
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async () => {
        throw new Error("Schema generation only");
      },
    }),
    steamOpenID({ apiKey: "schema-generation-only" }),
  ],
});
