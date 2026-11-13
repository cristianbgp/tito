import { mkdtemp, open, rm, stat, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { createApp } from "../app";
import { createAuth } from "../auth";
import { readConfig } from "../config";
import { createTestDatabase } from "../db/test-database";
import { user } from "../db/schema";
import { existingTestSession } from "../test-utils/session";

it.skipIf(!process.env.TEST_REPLAY_FILE)(
  "imports a real replay through the complete chunked protocol and removes the original upload",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "tito-real-replay-"));
    const config = readConfig({
      DATA_DIR: directory,
      REPLAY_PARSER_JAR: process.env.REPLAY_PARSER_JAR,
      REPLAY_JAVA_BIN: process.env.REPLAY_JAVA_BIN,
    });
    const database = await createTestDatabase(directory);
    const auth = createAuth(config, database.db);
    const app = createApp(config, auth, undefined, database.db);
    const file = await open(process.env.TEST_REPLAY_FILE!, "r");
    try {
      const fixture = await existingTestSession(
        auth,
        "real-replay@tests.invalid",
      );
      const accountId = process.env.TEST_REPLAY_ACCOUNT_ID!;
      await database.db
        .update(user)
        .set({ steamId: String(76561197960265728n + BigInt(accountId)) })
        .where(eq(user.id, fixture.original.user.id));
      const headers = { Cookie: fixture.cookie, Origin: config.webUrl };
      const capabilities = await (
        await app.request("/api/replays/capabilities", { headers })
      ).json();
      expect(capabilities.enabled).toBe(true);
      const size = (await stat(process.env.TEST_REPLAY_FILE!)).size;
      const created = await app.request("/api/replays/imports", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "lobby.dem", size }),
      });
      expect(created.status).toBe(201);
      const job = await created.json();
      for (let offset = 0; offset < size; offset += capabilities.chunkBytes) {
        const buffer = Buffer.alloc(
          Math.min(capabilities.chunkBytes, size - offset),
        );
        const { bytesRead } = await file.read(buffer, 0, buffer.length, offset);
        expect(bytesRead).toBe(buffer.length);
        const response = await app.request(
          `/api/replays/imports/${job.id}?offset=${offset}`,
          {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/octet-stream" },
            body: buffer,
          },
        );
        expect(response.status).toBe(200);
      }
      const submitted = await app.request(
        `/api/replays/imports/${job.id}/complete`,
        { method: "POST", headers },
      );
      expect(submitted.status).toBe(202);
      let status = await submitted.json();
      const deadline = Date.now() + 125_000;
      while (status.status === "processing" && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        status = await (
          await app.request(`/api/replays/imports/${job.id}`, { headers })
        ).json();
      }
      expect(status.error).toBeNull();
      expect(status.status).toBe("complete");
      const response = await app.request(`/api/matches/${status.matchId}`, {
        headers,
      });
      expect(response.status).toBe(200);
      const match = await response.json();
      expect(match.source).toBe("replay");
      expect(
        match.players.some(
          (player: { accountId: string }) => player.accountId === accountId,
        ),
      ).toBe(true);
      expect(match.goldAdvantage.length).toBeGreaterThan(0);
      if (process.env.TEST_REPLAY_EXPECTED_ID)
        expect(match.id).toBe(process.env.TEST_REPLAY_EXPECTED_ID);
      const history = await (
        await app.request("/api/history", { headers })
      ).json();
      expect(history.matches).toHaveLength(1);
      expect(history.matches[0]).toMatchObject({
        id: match.id,
        source: "replay",
      });
      expect(await readdir(join(directory, "replay-uploads"))).toEqual([]);
    } finally {
      await file.close();
      await app.closeReplayImports();
      await database.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
  180_000,
);
