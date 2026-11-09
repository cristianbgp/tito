import { mayCache } from "/offline-policy.js";
const CACHE = "tito-public-v1";
const PUBLIC = [
  "/offline.html",
  "/reference-catalog.json",
  "/offline-policy.js",
  "/manifest.webmanifest",
  "/brand/isotype-180.png",
  "/brand/isotype-512.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PUBLIC))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("tito-public-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
async function save(request, response) {
  if (!response.ok || response.type === "opaque") return;
  try {
    const copy = response.clone();
    if (Number(copy.headers.get("content-length")) > 2 * 1024 * 1024) return;
    if ((await copy.arrayBuffer()).byteLength > 2 * 1024 * 1024) return;
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    for (const key of keys
      .filter((k) => !PUBLIC.includes(new URL(k.url).pathname))
      .slice(0, Math.max(0, keys.length - 60)))
      await cache.delete(key);
  } catch {}
}
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    request.method !== "GET"
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    );
    return;
  }
  if (mayCache(request.url, self.location.origin, request.method))
    event.respondWith(
      fetch(request)
        .then((response) => {
          event.waitUntil(save(request, response));
          return response;
        })
        .catch(() => caches.match(request)),
    );
});
