import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createTestDatabase } from "../db/test-database";
import { readConfig } from "../config";
import { ReplayImports } from "./imports";

it("bounds simultaneous uploads, rejects bad chunks and removes cancelled files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tito-upload-lifecycle-"));
  const database = await createTestDatabase(directory);
  const uploads = new ReplayImports(
    readConfig({ DATA_DIR: directory }),
    database.db,
    {
      available: true,
      parse: async () => {
        throw new Error("Unexpected parse of incomplete data");
      },
    },
  );
  try {
    const job = await uploads.begin("owner", "42", 32);
    await expect(uploads.begin("another", "43", 32)).rejects.toMatchObject({
      status: 429,
    });
    await expect(uploads.status("another", job.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      uploads.chunk("owner", job.id, 0, new Uint8Array(32)),
    ).rejects.toMatchObject({ status: 400 });
    await expect(uploads.complete("owner", job.id)).rejects.toMatchObject({
      status: 409,
    });
    expect((await uploads.cancel("owner", job.id)).status).toBe("failed");
    expect(await readdir(join(directory, "replay-uploads"))).toEqual([]);
    expect((await uploads.begin("another", "43", 32)).status).toBe("uploading");
  } finally {
    await uploads.close();
    await database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it("aborts processing on cancellation before any match is persisted", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tito-upload-cancel-"));
  const database = await createTestDatabase(directory);
  const uploads = new ReplayImports(
    readConfig({ DATA_DIR: directory }),
    database.db,
    {
      available: true,
      parse: (_path, _account, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("Aborted")), {
            once: true,
          });
        }),
    },
  );
  try {
    const data = Buffer.from("PBDEMS2\0complete-test-file");
    const job = await uploads.begin("owner", "42", data.length);
    await uploads.chunk("owner", job.id, 0, data);
    await uploads.complete("owner", job.id);
    expect((await uploads.cancel("owner", job.id)).status).toBe("failed");
    expect(await readdir(join(directory, "replay-uploads"))).toEqual([]);
  } finally {
    await uploads.close();
    await database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
