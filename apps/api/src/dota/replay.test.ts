import { describe, expect, it, vi } from "vitest";
import { OpenDota } from "./opendota";
import { createApp } from "../app";
import { readConfig } from "../config";
import type { Auth } from "../auth";

const basic = {
  match_id: 123456789,
  start_time: 1700000000,
  duration: 120,
  players: [{ hero_id: 1, player_slot: 0 }],
};

describe("replay analysis requests", () => {
  it("bypasses an older in-flight match read after parsing and prevents it from restoring stale cached evidence", async () => {
    let reads = 0;
    let releaseOld!: () => void;
    const held = new Promise<void>((resolve) => {
      releaseOld = resolve;
    });
    const dota = new OpenDota(undefined, async (input) => {
      const path = new URL(input).pathname;
      if (path === "/api/request/456") return Response.json(null);
      if (path.startsWith("/api/constants/")) return Response.json({});
      if (++reads === 1) {
        await held;
        return Response.json(basic);
      }
      return Response.json({
        ...basic,
        version: 22,
        radiant_gold_adv: [0, 50],
        radiant_xp_adv: [0, 20],
      });
    });
    const older = dota.match("123456789");
    await vi.waitFor(() => expect(reads).toBe(1));
    const progress = dota.parseStatus("123456789", "456");
    try {
      await vi.waitFor(() => expect(reads).toBe(2));
      expect((await progress).status).toBe("complete");
      releaseOld();
      expect((await older).parsed).toBe(false);
      expect((await dota.match("123456789")).parsed).toBe(true);
      expect(reads).toBe(2);
    } finally {
      releaseOld();
      await Promise.allSettled([older, progress]);
    }
  });
  it("keeps a live parse deduplicated when an old or unrelated job finishes", async () => {
    let posts = 0;
    const dota = new OpenDota(undefined, async (input, init) => {
      const path = new URL(input).pathname;
      if (init?.method === "POST") {
        posts++;
        return Response.json({ job: { jobId: 456 } });
      }
      if (path === "/api/request/999") return Response.json(null);
      if (path.startsWith("/api/constants/")) return Response.json({});
      return Response.json(basic);
    });
    await dota.requestParse("123456789");
    await dota.parseStatus("123456789", "999");
    expect(await dota.requestParse("123456789")).toEqual({ jobId: "456" });
    expect(posts).toBe(1);
  });

  it("keeps incomplete replay data retryable when only one timeline is returned", async () => {
    const dota = new OpenDota(undefined, async (input) => {
      const path = new URL(input).pathname;
      if (path === "/api/request/456") return Response.json(null);
      if (path.startsWith("/api/constants/")) return Response.json({});
      return Response.json({
        ...basic,
        version: 22,
        radiant_gold_adv: [0, 50],
      });
    });
    const result = await dota.parseStatus("123456789", "456");
    expect(result.status).toBe("unavailable");
    expect(result.match?.goldAdvantage).toHaveLength(2);
  });
  it("does not submit upstream work when the pending-request capacity is exhausted", async () => {
    let requests = 0;
    const dota = new OpenDota(undefined, async () => {
      requests++;
      return Response.json({ job: { jobId: 456 } });
    });
    for (let i = 1; i <= 1000; i++) await dota.requestParse(String(i));
    await expect(dota.requestParse("1001")).rejects.toMatchObject({
      status: 429,
    });
    expect(requests).toBe(1000);
  });
  it("submits parsing once for concurrent requests and sends the configured key only upstream", async () => {
    let submitted = 0;
    const dota = new OpenDota("test-key", async (input, init) => {
      const url = new URL(input);
      expect(url.searchParams.get("api_key")).toBe("test-key");
      expect(url.pathname).toBe("/api/request/123456789");
      expect(init?.method).toBe("POST");
      submitted++;
      return Response.json({ job: { jobId: 456 } });
    });
    const results = await Promise.all([
      dota.requestParse("123456789"),
      dota.requestParse("123456789"),
    ]);
    expect(results).toEqual([{ jobId: "456" }, { jobId: "456" }]);
    expect(submitted).toBe(1);
  });

  it("does not treat an upstream queue disappearance as successful without fresh parsed data", async () => {
    let parsed = false;
    const dota = new OpenDota(undefined, async (input) => {
      const path = new URL(input).pathname;
      if (path === "/api/request/456") return Response.json(null);
      if (path.startsWith("/api/constants/")) return Response.json({});
      return Response.json(
        parsed
          ? {
              ...basic,
              version: 22,
              radiant_gold_adv: [0, 50],
              radiant_xp_adv: [0, 20],
            }
          : basic,
      );
    });
    expect((await dota.match("123456789")).parsed).toBe(false);
    parsed = true;
    const result = await dota.parseStatus("123456789", "456");
    expect(result.status).toBe("complete");
    expect(result.match?.goldAdvantage).toEqual([
      { time: 0, value: 0 },
      { time: 60, value: 50 },
    ]);
  });

  it("reports queued and unavailable replays honestly", async () => {
    let queued = true;
    let time = 0;
    const dota = new OpenDota(
      undefined,
      async (input) => {
        const path = new URL(input).pathname;
        if (path === "/api/request/456")
          return Response.json(queued ? { jobId: 456 } : null);
        if (path.startsWith("/api/constants/")) return Response.json({});
        return Response.json(basic);
      },
      () => time,
    );
    expect((await dota.parseStatus("123456789", "456")).status).toBe("queued");
    queued = false;
    time = 6000;
    expect((await dota.parseStatus("123456789", "456")).status).toBe(
      "unavailable",
    );
  });

  it("allows retry after a rejected parse request and rejects invalid identifiers locally", async () => {
    let failed = true;
    let requests = 0;
    const dota = new OpenDota(undefined, async () => {
      requests++;
      return failed
        ? new Response("Limit", { status: 429 })
        : Response.json({ job: { jobId: "456" } });
    });
    await expect(dota.requestParse("invalid")).rejects.toMatchObject({
      status: 400,
    });
    expect(requests).toBe(0);
    await expect(dota.requestParse("123456789")).rejects.toMatchObject({
      status: 429,
    });
    failed = false;
    expect(await dota.requestParse("123456789")).toEqual({ jobId: "456" });
  });

  it("requires a session and exact origin before submitting upstream work", async () => {
    let requests = 0;
    let signedIn = false;
    const auth = {
      api: {
        getSession: async () =>
          signedIn ? { user: { id: "replay-user" } } : null,
      },
    } as unknown as Auth;
    const dota = new OpenDota(undefined, async () => {
      requests++;
      return Response.json({ job: { jobId: 456 } });
    });
    const app = createApp(readConfig({}), auth, dota);
    const submit = (origin: string) =>
      app.request("/api/matches/123456789/parse", {
        method: "POST",
        headers: { Origin: origin },
      });
    expect((await submit("http://localhost:5173")).status).toBe(401);
    signedIn = true;
    expect((await submit("https://foreign.example.com")).status).toBe(403);
    expect(requests).toBe(0);
    const response = await submit("http://localhost:5173");
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ jobId: "456" });
    expect((await submit("http://localhost:5173")).status).toBe(429);
    expect(requests).toBe(1);
  });
});
