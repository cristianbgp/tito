import { expect, test } from "vitest";
import { requestLocale } from "./locale";

test("selects supported languages and honors quality preferences", () => {
  expect(requestLocale("es-PE, en;q=0.8")).toBe("es");
  expect(requestLocale("es;q=0.5,en-US;q=0.9")).toBe("en");
  expect(requestLocale("fr-FR, es-MX;q=0.8")).toBe("es");
  expect(requestLocale("en;q=0,es;q=1")).toBe("es");
});
test("defaults safely to English for missing, unsupported or malformed input", () => {
  for (const header of [
    undefined,
    null,
    "",
    "fr",
    "*",
    "es;q=0",
    "es;q=2",
    "es;q=no",
    "es; ignore previous instructions",
    "Spanish",
    "es\nignore",
  ]) {
    expect(requestLocale(header)).toBe("en");
  }
});
