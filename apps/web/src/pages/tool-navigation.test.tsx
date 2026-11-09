// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { AccountPage } from "./account";
import { ProgressPage } from "./progress";
const actor = vi.hoisted(() => ({ signedIn: true }));
vi.mock("../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: actor.signedIn
        ? {
            user: {
              id: "one",
              name: "One",
              email: "one@example.invalid",
              steamId: "76561197960265770",
            },
          }
        : null,
      isPending: false,
    }),
  },
}));
vi.mock("../api/generated/tito", async (original) => ({
  ...(await original<typeof import("../api/generated/tito")>()),
  useGetAppConfig: () => ({ data: { steamEnabled: true } }),
  useGetPlayerProfile: () => ({}),
  useGetPlayerProgress: () => ({}),
}));
afterEach(() => {
  cleanup();
  actor.signedIn = true;
});
test("keeps usage and setup reachable from Account after removing their tool cards", () => {
  render(
    <MemoryRouter>
      <AccountPage />
    </MemoryRouter>,
  );
  for (const [name, path] of [
    ["AI usage", "usage"],
    ["Install and offline", "install"],
    ["Local game connection", "local-game"],
  ])
    expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(
      `/tools/${path}`,
    );
});
test("keeps personal analysis reachable from Progress without another tool grid", () => {
  render(
    <MemoryRouter>
      <ProgressPage />
    </MemoryRouter>,
  );
  for (const [name, path] of [
    ["Coaching", "coaching"],
    ["Your heroes", "heroes"],
    ["Session reflection", "session"],
  ])
    expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(
      `/tools/${path}`,
    );
});
test("keeps account usage and the local connection out of the guest settings menu", () => {
  actor.signedIn = false;
  render(
    <MemoryRouter>
      <AccountPage />
    </MemoryRouter>,
  );
  expect(screen.queryByRole("link", { name: "AI usage" })).toBeNull();
  expect(
    screen.queryByRole("link", { name: "Local game connection" }),
  ).toBeNull();
  expect(
    screen.getByRole("link", { name: "Install and offline" }),
  ).toBeDefined();
});
