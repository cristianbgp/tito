/** Only public static material may enter the offline cache. All API traffic stays network-only. */
export function mayCache(url, origin, method = "GET") {
  const target = new URL(url, origin);
  return (
    method === "GET" &&
    target.origin === origin &&
    !target.search &&
    (target.pathname.startsWith("/assets/") ||
      target.pathname.startsWith("/brand/") ||
      [
        "/offline.html",
        "/reference-catalog.json",
        "/manifest.webmanifest",
        "/offline-policy.js",
      ].includes(target.pathname))
  );
}
