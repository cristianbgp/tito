import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./tables";
import { HistoryService } from "../history/service";
import { ReviewService } from "../review/service";
import { reserveReview, settleReview } from "../review/budget";
import { detail, validReview } from "../review/test-fixtures";
import { readConfig } from "../config";
import { DraftService } from "../draft/service";
import { draftInputSchema } from "../draft/contracts";
import { describe, expect, it } from "vitest";
import { migrateDatabase } from "./migrate";

const baseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!baseUrl)("real PostgreSQL lifecycle", () => {
  it("stops production startup when database setup fails", () => {
    const result = spawnSync("bun", ["run", "start"], {
      cwd: new URL("../../../..", import.meta.url),
      env: {
        ...process.env,
        DATABASE_URL: "postgres://unavailable@127.0.0.1:1/tito",
      },
      encoding: "utf8",
      timeout: 15000,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Cannot reach PostgreSQL");
    expect(result.stdout).not.toContain("Tito API ready");
  });
  it("creates a missing database, migrates concurrently, and preserves records on repeated setup", async () => {
    const name = `tito_test_${randomUUID().replaceAll("-", "")}`;
    const target = new URL(baseUrl!);
    target.pathname = `/${name}`;
    const maintenance = new URL(baseUrl!);
    maintenance.pathname = "/postgres";
    const admin = postgres(maintenance.toString(), {
      max: 1,
      connect_timeout: 5,
    });
    const client = postgres(target.toString(), { max: 4, connect_timeout: 5 });
    try {
      await expect(client`select 1`).rejects.toMatchObject({ code: "3D000" });
      await Promise.all([
        migrateDatabase({ DATABASE_URL: target.toString() }),
        migrateDatabase({ DATABASE_URL: target.toString() }),
      ]);
      const tables =
        await client`select tablename from pg_tables where schemaname = 'public' order by tablename`;
      expect(tables.map((row) => row.tablename)).toEqual([
        "account",
        "coaching_state",
        "draft_snapshot",
        "hero_draft",
        "hero_pool",
        "match_annotation",
        "match_review",
        "player_match",
        "player_profile",
        "player_sync",
        "provider_budget",
        "replay_import_budget",
        "replay_match",
        "review_attempt",
        "review_budget",
        "review_control",
        "session",
        "user",
        "verification",
      ]);
      await client`insert into "user" (id, name, email) values ('migration-check', 'Migration Check', 'migration@example.com')`;
      const before =
        await client`select count(*)::int as count from drizzle.__drizzle_migrations`;
      await migrateDatabase({ DATABASE_URL: target.toString() });
      expect(
        await client`select name, is_admin from "user" where id = 'migration-check'`,
      ).toEqual([{ name: "Migration Check", is_admin: false }]);
      await client`update "user" set is_admin = true where id = 'migration-check'`;
      await migrateDatabase({ DATABASE_URL: target.toString() });
      expect(
        await client`select is_admin from "user" where id = 'migration-check'`,
      ).toEqual([{ is_admin: true }]);
      const journal =
        await client`select count(*)::int as count from drizzle.__drizzle_migrations`;
      expect(journal[0].count).toBe(before[0].count);
      const db = drizzle(client, { schema });
      const source = {
        historyMatches: async () => [
          {
            id: "9001",
            accountId: "42",
            heroId: 1,
            hero: "Anti-Mage",
            gameMode: 22,
            lobbyType: 7,
            heroImage: null,
            startedAt: 1700000000,
            duration: 1800,
            result: "win" as const,
            kills: 4,
            deaths: 2,
            assists: 8,
            goldPerMinute: 500,
            experiencePerMinute: null,
          },
        ],
      };
      const options = { maxMatches: 100, cooldownSeconds: 60 };
      const results = await Promise.allSettled([
        new HistoryService(db, source, options).sync(
          "migration-check",
          "42",
          "latest",
        ),
        new HistoryService(db, source, options).sync(
          "migration-check",
          "42",
          "latest",
        ),
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
      expect(
        await new HistoryService(db, source, options).read(
          "migration-check",
          "42",
          100,
        ),
      ).toMatchObject({
        total: 1,
        matches: [{ id: "9001", kills: 4, gameMode: 22, lobbyType: 7 }],
      });
      expect(
        await new HistoryService(db, source, options).progress(
          "migration-check",
          "42",
        ),
      ).toMatchObject({
        retainedMatches: 1,
        timeZone: "UTC",
        weeks: expect.any(Array),
      });
      const budgetResults = await Promise.allSettled(
        ["pg-a", "pg-b"].map((token) =>
          reserveReview(
            db,
            "migration-check",
            token,
            7000,
            { dailyCents: 1, monthlyCents: 2, userDaily: 5 },
            Date.UTC(2020, 0, 1),
          ),
        ),
      );
      expect(
        budgetResults.filter((r) => r.status === "fulfilled"),
      ).toHaveLength(1);
      const paidToken =
        budgetResults[0].status === "fulfilled" ? "pg-a" : "pg-b";
      await Promise.all([
        settleReview(db, paidToken, 1000),
        settleReview(db, paidToken, 1000),
      ]);
      expect(
        await client`select used_micros::int from review_budget where key='global:day'`,
      ).toEqual([{ used_micros: 1000 }]);
      const review = new ReviewService(
        db,
        { match: async () => detail() },
        {
          generate: async () => ({
            content: validReview(),
            usage: { input: 1000, output: 400 },
          }),
        },
        readConfig({ OPENAI_API_KEY: "controlled" }),
      );
      const reviewResults = await Promise.allSettled([
        review.generate("migration-check", "42", "900"),
        review.generate("migration-check", "42", "900"),
      ]);
      expect(
        reviewResults.filter((r) => r.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        (await review.read("migration-check", "42", "900")).review?.content,
      ).toEqual(validReview());
      const draft = new DraftService(
        db,
        {
          evaluate: async (c) => ({
            ratings: c.candidates.map((h) => ({
              id: h.id,
              fit: 3,
              confidence: 0.7,
              reason: "role_fit",
              tradeoff: "limited_information",
            })),
            inputTokens: 2000,
          }),
        },
        readConfig({ OPENAI_API_KEY: "controlled" }),
      );
      const draftInput = draftInputSchema.parse({
        role: "5",
        allies: [],
        enemies: [],
        bans: [],
        pool: [5, 20],
        useHistory: false,
      });
      const suggestions = await draft.suggest(
        "migration-check",
        null,
        draftInput,
      );
      expect(suggestions.recommendations).toHaveLength(3);
      expect(
        suggestions.recommendations.some(
          ({ hero }) => !draftInput.pool.includes(hero.id),
        ),
      ).toBe(true);
      expect(await draft.suggest("migration-check", null, draftInput)).toEqual(
        suggestions,
      );
    } finally {
      await client.end({ timeout: 2 });
      // Only this test's uniquely named database is removed; never the configured application DB.
      await admin`drop database if exists ${admin(name)}`;
      await admin.end({ timeout: 2 });
    }
  });

  it("production start provisions and migrates before reporting API readiness", async () => {
    const name = `tito_test_${randomUUID().replaceAll("-", "")}`;
    const target = new URL(baseUrl!);
    target.pathname = `/${name}`;
    const maintenance = new URL(baseUrl!);
    maintenance.pathname = "/postgres";
    const admin = postgres(maintenance.toString(), {
      max: 1,
      connect_timeout: 5,
    });
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
    const port = (probe.address() as { port: number }).port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    const child = spawn("bun", ["run", "start"], {
      cwd: new URL("../../../..", import.meta.url),
      detached: true,
      env: {
        ...process.env,
        DATABASE_URL: target.toString(),
        PORT: String(port),
        WEB_URL: "https://tito.example.com",
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: randomUUID() + randomUUID(),
        EMAIL_TRANSPORT: "disabled",
        RESEND_API_KEY: "",
        EMAIL_FROM: "",
        STEAM_API_KEY: "steam-test-key",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let logs = "";
    child.stdout?.on("data", (chunk) => {
      logs += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      logs += String(chunk);
    });
    const closed = once(child, "close");
    try {
      let ready = false;
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline && child.exitCode === null) {
        try {
          ready = (await fetch(`http://127.0.0.1:${port}/api/health`)).ok;
        } catch {}
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(ready, logs).toBe(true);
      expect(logs.indexOf("migrations applied")).toBeLessThan(
        logs.indexOf("Tito API ready"),
      );
      const inbox = await fetch(`http://127.0.0.1:${port}/api/dev/emails`);
      expect(inbox.status).toBe(404);
      const capabilities = await fetch(`http://127.0.0.1:${port}/api/config`);
      expect(await capabilities.json()).toMatchObject({
        steamEnabled: true,
        emailTransport: "disabled",
        localInboxEnabled: false,
      });
      const emailLogin = await fetch(
        `http://127.0.0.1:${port}/api/auth/sign-in/magic-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://tito.example.com",
          },
          body: JSON.stringify({ email: "player@example.com" }),
        },
      );
      expect(emailLogin.status).toBe(404);
    } finally {
      if (child.pid) {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {}
      }
      await closed;
      await admin`drop database if exists ${admin(name)}`;
      await admin.end({ timeout: 2 });
    }
  });
});
