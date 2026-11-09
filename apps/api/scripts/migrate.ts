import { migrateDatabase } from "../src/db/migrate";

try {
  await migrateDatabase(process.env);
  console.log("Tito PostgreSQL database ready; migrations applied.");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Database setup failed.",
  );
  process.exitCode = 1;
}
