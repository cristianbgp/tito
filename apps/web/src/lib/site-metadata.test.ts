// @vitest-environment jsdom
import { expect, test } from "vitest";
import { resolveSiteMetadata, renderSiteMetadata } from "./site-metadata";
test("produces crawler-visible absolute social metadata for a public deployment", () => {
  const doc = new DOMParser().parseFromString(
    `<html><head>${renderSiteMetadata(resolveSiteMetadata({ publicUrl: "https://tito.example/" }))}</head></html>`,
    "text/html",
  );
  expect(doc.title).toBe("Tito | Your next game, better.");
  const content = (name: string) =>
    doc
      .querySelector(`meta[property="${name}"],meta[name="${name}"]`)
      ?.getAttribute("content");
  expect(content("og:url")).toBe("https://tito.example/");
  expect(content("og:image")).toBe("https://tito.example/brand/og-image.png");
  expect(content("og:image:width")).toBe("1200");
  expect(content("og:image:height")).toBe("630");
  expect(content("og:image:alt")).toBeTruthy();
  expect(content("twitter:card")).toBe("summary_large_image");
  expect(content("twitter:image")).toBe(content("og:image"));
  expect(content("robots")).toBe("index,follow");
  expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
    "https://tito.example/",
  );
});
test("keeps local and automatic preview deployments out of search and never guesses a public domain", () => {
  const local = resolveSiteMetadata({
    developmentUrl: "https://tito.localhost",
  });
  expect(local.robots).toBe("noindex,nofollow");
  expect(local.url).toBe("https://tito.localhost/");
  const preview = resolveSiteMetadata({
    deploymentUrl: "https://preview.tito.pages.dev",
  });
  expect(preview.url).toBe("https://preview.tito.pages.dev/");
  expect(preview.robots).toBe("noindex,nofollow");
});
test("rejects credential, non-web and subpath origins instead of publishing a broken preview", () => {
  for (const publicUrl of [
    "javascript:alert(1)",
    "https://token@tito.example",
    "https://tito.example/app",
    "https://tito.example/?token=secret",
    "http://tito.example",
  ]) {
    expect(() => resolveSiteMetadata({ publicUrl })).toThrow();
  }
});
