import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { migrationsDirectory } from "../config";
import * as schema from "./tables";

export async function createTestDatabase(dataDir: string) {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const client = new PGlite(resolve(dataDir, "postgres"));
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: migrationsDirectory });
  return { db, close: () => client.close() };
}
