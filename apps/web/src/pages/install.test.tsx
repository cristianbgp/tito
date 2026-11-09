// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { InstallPage } from "./install";
import { setLocale } from "../i18n";
const originalServiceWorker = Object.getOwnPropertyDescriptor(
  navigator,
  "serviceWorker",
);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setLocale("en", false);
  if (originalServiceWorker)
    Object.defineProperty(navigator, "serviceWorker", originalServiceWorker);
  else Reflect.deleteProperty(navigator, "serviceWorker");
});
function mount(fail = false) {
  const stored = new Set<string>();
  const addAll = vi.fn(async (paths: string[]) => {
    if (fail) throw new Error("public cache preparation failed");
    for (const path of paths) stored.add(path);
  });
  const registration = { active: { scriptURL: "http://localhost/sw.js" } };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register: vi.fn(async () => registration),
      ready: Promise.resolve(registration),
    },
  });
  vi.stubGlobal("caches", { open: vi.fn(async () => ({ addAll })) });
  render(
    <MemoryRouter>
      <InstallPage />
    </MemoryRouter>,
  );
  return { stored, addAll };
}
test("Enable repairs missing public cache even when a worker is already active, and repeats after cache deletion", async () => {
  const { stored, addAll } = mount();
  expect(stored.size).toBe(0);
  await userEvent.click(
    screen.getByRole("button", { name: "Enable offline references" }),
  );
  await screen.findByText(
    "Public offline references are ready on this device.",
  );
  expect(stored.has("/offline.html")).toBe(true);
  expect(stored.has("/reference-catalog.json")).toBe(true);
  expect(
    [...stored].every(
      (path) => !path.startsWith("/api/") && !path.includes("?"),
    ),
  ).toBe(true);
  stored.clear();
  await userEvent.click(
    screen.getByRole("button", { name: "Enable offline references" }),
  );
  await screen.findByText(
    "Public offline references are ready on this device.",
  );
  expect(stored.has("/reference-catalog.json")).toBe(true);
  expect(addAll).toHaveBeenCalledTimes(2);
  act(() => setLocale("es", false));
  expect(screen.getByRole("status").textContent).toBe(
    "Las referencias públicas sin conexión están listas en este dispositivo.",
  );
});
test("translates a local unsupported-browser error when the language changes", async () => {
  Reflect.deleteProperty(navigator, "serviceWorker");
  render(
    <MemoryRouter>
      <InstallPage />
    </MemoryRouter>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Enable offline references" }),
  );
  expect(screen.getByRole("alert").textContent).toBe(
    "This browser cannot enable offline references here.",
  );
  act(() => setLocale("es", false));
  expect(screen.getByRole("alert").textContent).toBe(
    "Este navegador no puede habilitar las referencias sin conexión aquí.",
  );
});
test("an active worker alone cannot report references ready when public cache preparation fails", async () => {
  mount(true);
  await userEvent.click(
    screen.getByRole("button", { name: "Enable offline references" }),
  );
  await screen.findByRole("alert");
  expect(
    screen.queryByText("Public offline references are ready on this device."),
  ).toBeNull();
});
