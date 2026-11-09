// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppearanceProvider, AppearanceControl } from "./appearance";
import { appearanceKey } from "../lib/appearance";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("keeps one appearance selected while supporting arrow-key navigation and persisted changes", async () => {
  const user = userEvent.setup();
  render(
    <AppearanceProvider>
      <AppearanceControl />
    </AppearanceProvider>,
  );
  const dark = screen.getByRole("button", { name: "Dark appearance" });
  await user.click(dark);
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem(appearanceKey)).toBe("dark");
  await user.keyboard("{ArrowLeft}");
  const light = screen.getByRole("button", { name: "Light appearance" });
  expect(document.activeElement).toBe(light);
  await user.keyboard(" ");
  expect(document.documentElement.dataset.theme).toBe("light");
  await user.click(light);
  expect(light.getAttribute("aria-pressed")).toBe("true");
  expect(dark.getAttribute("aria-pressed")).toBe("false");
  await user.click(
    screen.getByRole("button", { name: "Use system appearance" }),
  );
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem(appearanceKey)).toBe("system");
});
