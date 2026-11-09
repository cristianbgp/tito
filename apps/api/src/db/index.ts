import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import postgres from "postgres";
import type { Config } from "../config";
import { databaseErrorMessage, readDatabaseConfig } from "./config";
import * as schema from "./tables";

export async function createDatabase(config: Pick<Config, "databaseUrl">) {
  const { databaseUrl } = readDatabaseConfig({
    DATABASE_URL: config.databaseUrl,
  });
  const client = postgres(databaseUrl, { max: 10, connect_timeout: 10 });
  try {
    await client`select 1`;
  } catch (error) {
    await client.end({ timeout: 5 });
    throw new Error(databaseErrorMessage(error));
  }
  return {
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: 5 }),
  };
}

// The embedded adapter is available only to isolated tests; runtime connections always use PostgreSQL.
export type Database =
  PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;
