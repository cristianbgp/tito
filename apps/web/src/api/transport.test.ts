import { afterEach, expect, it, vi } from "vitest";
import { apiFetch } from "./transport";
import { setLocale } from "../i18n";
afterEach(() => {
  vi.unstubAllGlobals();
  setLocale("en", false);
});
it("sends the current locale on each request while preserving caller headers and raw errors", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ ok: true }))
    .mockResolvedValueOnce(
      Response.json(
        { error: "Unable to complete this request." },
        { status: 503 },
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  setLocale("es", false);
  await apiFetch("/api/test", { headers: { "X-Test": "retained" } });
  const headers = fetcher.mock.calls[0]![1].headers as Headers;
  expect(headers.get("Accept-Language")).toBe("es");
  expect(headers.get("X-Test")).toBe("retained");
  setLocale("en", false);
  await expect(apiFetch("/api/test")).rejects.toMatchObject({
    message: "Unable to complete this request.",
    status: 503,
  });
  expect(
    (fetcher.mock.calls[1]![1].headers as Headers).get("Accept-Language"),
  ).toBe("en");
});
