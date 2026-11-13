import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createTestDatabase } from "../db/test-database";
import { claimReplayImport } from "./budget";
it("atomically limits import attempts per user and across the server", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tito-replay-budget-"));
  const database = await createTestDatabase(dir);
  try {
    const results = await Promise.allSettled([
      claimReplayImport(database.db, "owner", 1, 2),
      claimReplayImport(database.db, "owner", 1, 2),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await claimReplayImport(database.db, "second", 1, 2);
    await expect(
      claimReplayImport(database.db, "third", 1, 2),
    ).rejects.toMatchObject({ status: 429 });
  } finally {
    await database.close();
    await rm(dir, { recursive: true, force: true });
  }
});
