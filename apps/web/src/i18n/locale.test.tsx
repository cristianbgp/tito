// @vitest-environment jsdom
import { cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import * as i18n from "./index";

// The public locale boundary keeps existing English defaults and safely persists an explicit choice.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  i18n.setLocale("en");
});
it("defaults to English and restores only supported saved languages", () => {
  expect(i18n.getLocale()).toBe("en");
  localStorage.setItem("tito:locale", "es");
  i18n.initializeLocale();
  expect(i18n.copy.nav.matches).toBe("Partidas");
  expect(document.documentElement.lang).toBe("es");
  localStorage.setItem("tito:locale", "invalid");
  i18n.initializeLocale();
  expect(i18n.getLocale()).toBe("en");
});
it("switches complete catalogs and Intl formatting, then persists the explicit choice", () => {
  i18n.setLocale("es");
  expect(i18n.copy.nav.signIn).toBe("Iniciar sesión");
  expect(i18n.numberFormatter.format(12345.6)).toBe(
    new Intl.NumberFormat("es-419").format(12345.6),
  );
  expect(i18n.matchDateFormatter.format(new Date("2026-11-08T12:00:00Z"))).toBe(
    new Intl.DateTimeFormat("es-419", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date("2026-11-08T12:00:00Z")),
  );
  expect(localStorage.getItem("tito:locale")).toBe("es");
  i18n.setLocale("en");
  expect(i18n.copy.nav.matches).toBe("Matches");
});
it("keeps switching usable when browser storage is denied", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("denied");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("denied");
  });
  expect(() => i18n.initializeLocale()).not.toThrow();
  expect(() => i18n.setLocale("es")).not.toThrow();
  expect(i18n.getLocale()).toBe("es");
});
it("does not double punctuation after a localized Spanish time abbreviation", () => {
  i18n.setLocale("es");
  expect(i18n.copy.savedHistory.synced("8 nov, 5:35 p.m.")).toBe(
    "Última sincronización: 8 nov, 5:35 p.m.",
  );
});
