import { defineConfig } from "drizzle-kit";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

// Drizzle Kit runs in Node, so load the same API environment used by Bun's entry points.
const envFile = new URL("./.env", import.meta.url);
if (existsSync(envFile)) loadEnvFile(envFile);

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./src/db/schema.ts",
    "./src/profile/schema.ts",
    "./src/history/schema.ts",
    "./src/review/schema.ts",
    "./src/draft/schema.ts",
    "./src/library/schema.ts",
    "./src/coaching/schema.ts",
    "./src/replays/schema.ts",
  ],
  out: "./drizzle",
  ...(process.env.DATABASE_URL
    ? { dbCredentials: { url: process.env.DATABASE_URL } }
    : {}),
});
