import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { migrationsDirectory } from "../config";
import { databaseErrorMessage, readDatabaseConfig } from "./config";

const connectionOptions = {
  max: 1,
  connect_timeout: 10,
  prepare: false,
  onnotice: () => {},
};

export async function migrateDatabase(env: Record<string, string | undefined>) {
  const config = readDatabaseConfig(env);
  let client = postgres(config.databaseUrl, connectionOptions);
  try {
    try {
      await client`select 1`;
    } catch (error) {
      if (!(error instanceof postgres.PostgresError) || error.code !== "3D000")
        throw error;
      await client.end({ timeout: 5 });
      const admin = postgres(config.maintenanceUrl, connectionOptions);
      try {
        try {
          await admin`create database ${admin(config.databaseName)}`;
        } catch (error) {
          // Concurrent first starts can race to provision the same database; reconnect below confirms existence.
          if (
            !(error instanceof postgres.PostgresError) ||
            !["42P04", "23505"].includes(error.code)
          )
            throw error;
        }
      } finally {
        await admin.end({ timeout: 5 });
      }
      client = postgres(config.databaseUrl, connectionOptions);
      await client`select 1`;
    }
    // One direct PostgreSQL connection holds this session lock throughout migration.
    // Use a direct connection URL rather than a transaction-pooling endpoint.
    await client`select pg_advisory_lock(hashtext('tito:migrations'))`;
    try {
      await migrate(drizzle(client), { migrationsFolder: migrationsDirectory });
    } finally {
      await client`select pg_advisory_unlock(hashtext('tito:migrations'))`;
    }
  } catch (error) {
    throw new Error(databaseErrorMessage(error));
  } finally {
    await client.end({ timeout: 5 });
  }
}
