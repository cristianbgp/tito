import { expect, it } from "vitest";
import { mayCache } from "../../public/offline-policy.js";
it("caches public app assets but excludes auth, all API responses, query tokens and cross-origin URLs", () => {
  for (const path of [
    "/assets/app.js",
    "/brand/isotype.svg",
    "/reference-catalog.json",
    "/offline.html",
  ])
    expect(
      mayCache(`https://tito.example${path}`, "https://tito.example", "GET"),
    ).toBe(true);
  for (const path of [
    "/api/auth/get-session",
    "/api/history",
    "/api/tools/hero-picker",
    "/signin?token=secret",
    "/assets/app.js?token=secret",
  ])
    expect(
      mayCache(`https://tito.example${path}`, "https://tito.example", "GET"),
    ).toBe(false);
  expect(
    mayCache(
      "https://other.example/assets/a.js",
      "https://tito.example",
      "GET",
    ),
  ).toBe(false);
  expect(
    mayCache(
      "https://tito.example/assets/a.js",
      "https://tito.example",
      "POST",
    ),
  ).toBe(false);
});
