import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createTestDatabase } from "../db/test-database";
import { claimProviderRequest } from "./budget";
import { providerBudget } from "./schema";

let directory: string;
let database: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "tito-budget-"));
  database = await createTestDatabase(directory);
});
afterAll(async () => {
  await database?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

it("atomically limits requests shared by instances and rolls over at UTC midnight in one row", async () => {
  const day = Date.UTC(2026, 10, 7, 23, 59, 59);
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => claimProviderRequest(database.db, 2, day)),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(3);
  await expect(claimProviderRequest(database.db, 2, day)).rejects.toMatchObject(
    { status: 429 },
  );
  await claimProviderRequest(database.db, 2, day + 1000);
  expect(await database.db.select().from(providerBudget)).toEqual([
    { key: "opendota", period: "2026-11-08", used: 1 },
  ]);
});
