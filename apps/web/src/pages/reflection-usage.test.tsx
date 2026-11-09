// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { UsagePage } from "./usage";
import { SessionReflectionPage } from "./session-reflection";
const signedIn = vi.hoisted(() => ({ value: true }));
vi.mock("../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: signedIn.value
        ? { user: { id: "owner", steamId: "76561197960265770" } }
        : null,
      isPending: false,
    }),
  },
}));
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach((c) => c.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
  signedIn.value = true;
});
function mount(child: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{child}</MemoryRouter>
    </QueryClientProvider>,
  );
}
test("private personal usage shows separate remaining attempts and honest estimates", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({
      enabled: false,
      day: "2026-11-07",
      resetsAt: "2026-11-08T00:00:00Z",
      reviews: {
        attempts: 1,
        allowance: 5,
        remaining: 4,
        estimatedCostUsd: 0.001,
      },
      drafts: {
        attempts: 2,
        allowance: 30,
        remaining: 28,
        estimatedCostUsd: 0.002,
      },
      coaching: {
        attempts: 0,
        allowance: 10,
        remaining: 10,
        estimatedCostUsd: 0,
      },
      costBasis: "settled_or_reserved_estimate",
    }),
  );
  mount(<UsagePage />);
  await screen.findByText("4 remaining");
  expect(screen.getByText("28 remaining")).toBeDefined();
  expect(screen.getByText("10 remaining")).toBeDefined();
  expect(
    screen.getByText(/settled usage and outstanding reservations/),
  ).toBeDefined();
  expect(screen.getByText(/2026-11-08 00:00 UTC/)).toBeDefined();
});
test("usage does not request while signed out", () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  signedIn.value = false;
  mount(<UsagePage />);
  expect(screen.getByRole("link", { name: "Sign in" })).toBeDefined();
  expect(fetcher).not.toHaveBeenCalled();
});
test("session reflection uses saved-only latest or chosen UTC day without AI requests", async () => {
  const user = userEvent.setup(),
    fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({
        mode: "latest",
        day: null,
        games: 2,
        knownResults: 1,
        wins: 1,
        losses: 0,
        durationSeconds: 4800,
        kills: 0,
        deaths: null,
        assists: 5,
        reviewedGames: 1,
        notedGames: 0,
        summary: "Saved outcomes do not establish causes.",
        coverage: "retained_summaries",
        matchIds: ["100", "99"],
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  mount(<SessionReflectionPage />);
  await screen.findByText("Saved outcomes do not establish causes.");
  expect(
    screen.getByRole("link", { name: "Match 100" }).getAttribute("href"),
  ).toBe("/matches/100");
  fireEvent.change(screen.getByLabelText("UTC day"), {
    target: { value: "2026-11-06" },
  });
  await user.click(screen.getByRole("button", { name: "View day" }));
  await vi.waitFor(() =>
    expect(
      fetcher.mock.calls.some((args) =>
        String(args[0]).includes("day=2026-11-06"),
      ),
    ).toBe(true),
  );
  expect(
    fetcher.mock.calls.every(
      (args) => !args[1]?.method || args[1].method === "GET",
    ),
  ).toBe(true);
  expect(
    screen
      .getByRole("link", { name: "Open coaching notebook" })
      .getAttribute("href"),
  ).toBe("/tools/coaching");
});
