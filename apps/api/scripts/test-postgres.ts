import { resolve } from "node:path";

// Bun loads the API's .env for this entry point. Pass the URL explicitly to Node/Vitest;
// expanding it in a package-script shell can otherwise silently skip every integration test.
if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is required to run PostgreSQL integration checks.",
  );
  process.exit(1);
}
const child = Bun.spawn(
  ["bun", "run", "test", "apps/api/src/db/postgres.integration.test.ts"],
  {
    cwd: resolve(import.meta.dirname, "../../.."),
    env: { ...process.env, TEST_DATABASE_URL: process.env.DATABASE_URL },
    stdout: "inherit",
    stderr: "inherit",
  },
);
process.exitCode = await child.exited;
