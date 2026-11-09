import { afterEach, expect, it, vi } from "vitest";
import { onRequest } from "../../functions/api/[[path]]";

afterEach(() => vi.unstubAllGlobals());
it("proxies only API paths to an explicit HTTPS origin and preserves auth redirects and cookies", async () => {
  const fetcher = vi.fn(async (request: Request) => {
    expect(request.url).toBe(
      "https://api.example.com/api/auth/callback?state=abc",
    );
    expect(request.headers.get("cookie")).toBe("session=owned");
    expect(request.redirect).toBe("manual");
    return new Response(null, {
      status: 302,
      headers: {
        Location: "https://tito.example.com/account",
        "Set-Cookie": "session=updated; Secure; HttpOnly; Path=/",
      },
    });
  });
  vi.stubGlobal("fetch", fetcher);
  const response = await onRequest({
    request: new Request(
      "https://tito.example.com/api/auth/callback?state=abc",
      { headers: { Cookie: "session=owned" } },
    ),
    env: { API_ORIGIN: "https://api.example.com" },
  });
  expect(response.status).toBe(302);
  expect(response.headers.get("set-cookie")).toContain("session=updated");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("preserves POST bodies and Origin for the API's own write validation", async () => {
  vi.stubGlobal("fetch", async (request: Request) => {
    expect(request.method).toBe("POST");
    expect(request.headers.get("origin")).toBe("https://tito.example.com");
    expect(await request.json()).toEqual({ mode: "latest" });
    return Response.json({ total: 100 });
  });
  const response = await onRequest({
    request: new Request("https://tito.example.com/api/history/sync", {
      method: "POST",
      headers: {
        Origin: "https://tito.example.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode: "latest" }),
    }),
    env: { API_ORIGIN: "https://api.example.com" },
  });
  expect(response.status).toBe(200);
});
it("rejects missing, insecure, credential-bearing or self-referential upstreams without forwarding", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  for (const origin of [
    undefined,
    "http://api.example.com",
    "https://user:secret@api.example.com",
    "https://tito.example.com",
    "https://api.example.com/something",
  ]) {
    const response = await onRequest({
      request: new Request("https://tito.example.com/api/history"),
      env: { API_ORIGIN: origin },
    });
    expect(response.status).toBe(503);
  }
  expect(
    (
      await onRequest({
        request: new Request("https://tito.example.com/brand/logo.png"),
        env: { API_ORIGIN: "https://api.example.com" },
      })
    ).status,
  ).toBe(404);
  expect(fetcher).not.toHaveBeenCalled();
});
