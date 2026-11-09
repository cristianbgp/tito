import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, test, vi } from "vitest";
import { mayCache } from "../../public/offline-policy.js";
function worker() {
  const handlers = new Map<string, (event: any) => void>(),
    fallback = new Response("Public hero reference"),
    store = new Map<string, Response>();
  const cache = {
    addAll: vi.fn(async () => {}),
    put: vi.fn(async (req: Request, res: Response) => {
      store.set(req.url, res);
    }),
    keys: async () => Array.from(store.keys(), (url) => new Request(url)),
    delete: async (req: Request) => store.delete(req.url),
  };
  const caches = {
    open: async () => cache,
    keys: async () => ["tito-public-old", "unrelated"],
    delete: vi.fn(async () => true),
    match: vi.fn(async () => fallback),
  };
  const fetch = vi.fn(async () => new Response("public asset"));
  runInNewContext(
    readFileSync(
      new URL("../../public/sw.js", import.meta.url),
      "utf8",
    ).replace(/^import .*?;\s*/u, ""),
    {
      URL,
      Response,
      Request,
      mayCache,
      caches,
      fetch,
      self: {
        location: { origin: "https://tito.test" },
        addEventListener: (type: string, fn: any) => handlers.set(type, fn),
        skipWaiting: async () => {},
        clients: { claim: async () => {} },
      },
    },
  );
  return { handlers, cache, caches, fetch, fallback };
}
test("private APIs and cross-origin requests bypass worker interception; offline navigation falls back only to public reference", async () => {
  const w = worker(),
    respondWith = vi.fn();
  for (const url of [
    "https://tito.test/api/auth/get-session",
    "https://tito.test/api/library/notes",
    "https://api.tito.test/api/history",
    "https://tito.test/assets/app.js?token=private",
  ]) {
    w.handlers.get("fetch")!({
      request: { url, method: "GET", mode: "cors" },
      respondWith,
    });
  }
  expect(respondWith).not.toHaveBeenCalled();
  expect(w.fetch).not.toHaveBeenCalled();
  w.fetch.mockRejectedValueOnce(new Error("offline"));
  let response: Promise<Response> | undefined;
  w.handlers.get("fetch")!({
    request: {
      url: "https://tito.test/matches/900",
      method: "GET",
      mode: "navigate",
    },
    respondWith: (r: Promise<Response>) => (response = r),
  });
  expect(await (await response!).text()).toBe("Public hero reference");
  expect(w.caches.match).toHaveBeenCalledWith("/offline.html");
  expect(w.cache.put).not.toHaveBeenCalled();
});
test("activation removes only obsolete Tito public caches", async () => {
  const w = worker();
  let done: Promise<void> | undefined;
  w.handlers.get("activate")!({ waitUntil: (p: Promise<void>) => (done = p) });
  await done;
  expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith("tito-public-old");
});
