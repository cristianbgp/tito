// @vitest-environment jsdom
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import type { PlayerProgress } from "../api/generated/models";
import { getGetPlayerProgressQueryKey } from "../api/generated/tito";
import { ProgressPage } from "./progress";

const identity = vi.hoisted(() => ({
  signedIn: true,
  userId: "owner",
  steamId: "76561197960265770" as string | null,
}));
vi.mock("../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: identity.signedIn
        ? { user: { id: identity.userId, steamId: identity.steamId } }
        : null,
      isPending: false,
    }),
  },
}));
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
  identity.signedIn = true;
  identity.userId = "owner";
  identity.steamId = "76561197960265770";
});
const metric = (value: number | null, samples = 5) => ({ value, samples });
const current = {
  games: 6,
  wins: 3,
  losses: 2,
  unknown: 1,
  winRate: metric(0.6),
  deaths: metric(0),
  goldPerMinute: metric(600, 4),
  experiencePerMinute: metric(null, 0),
};
const previous = {
  ...current,
  games: 5,
  wins: 2,
  losses: 3,
  unknown: 0,
  winRate: metric(0.4),
  deaths: metric(4),
  goldPerMinute: metric(400),
};
const fixture: PlayerProgress = {
  accountId: "42",
  retainedMatches: 101,
  retentionLimit: 1000,
  lastSyncedAt: "2026-11-07T12:00:00.000Z",
  asOf: "2026-11-07T12:00:00.000Z",
  timeZone: "UTC",
  minimumSamples: 5,
  current: {
    from: "2026-10-10T12:00:00.000Z",
    to: "2026-11-07T12:00:00.000Z",
    stats: current,
  },
  previous: {
    from: "2026-09-12T12:00:00.000Z",
    to: "2026-10-10T12:00:00.000Z",
    stats: previous,
  },
  changes: {
    winRatePoints: 20,
    deaths: -4,
    goldPerMinute: null,
    experiencePerMinute: null,
  },
  weeks: Array.from({ length: 8 }, (_, index) => ({
    from: new Date(Date.UTC(2026, 8, 14 + index * 7)).toISOString(),
    to: new Date(Date.UTC(2026, 8, 21 + index * 7)).toISOString(),
    partial: index === 7,
    stats: current,
  })),
};
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  clients.push(client);
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

it("shows sign-in, Steam connection, and own-history import paths without provider calls", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({ ...fixture, retainedMatches: 0 }),
  );
  vi.stubGlobal("fetch", fetcher);
  identity.signedIn = false;
  let view = mount();
  expect(
    screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
  ).toBe("/signin");
  expect(fetcher).not.toHaveBeenCalled();
  view.unmount();
  identity.signedIn = true;
  identity.steamId = null;
  view = mount();
  expect(
    screen.getByRole("link", { name: "Connect Steam" }).getAttribute("href"),
  ).toBe("/account");
  expect(fetcher).not.toHaveBeenCalled();
  view.unmount();
  identity.steamId = "76561197960265770";
  mount();
  expect(
    (
      await screen.findByRole("link", { name: "Import my matches" })
    ).getAttribute("href"),
  ).toBe("/?player=76561197960265770");
});

it("renders real sample sizes, neutral percentage-point changes and accessible weekly numbers", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", async () => Response.json(fixture));
  mount();
  const rate = await screen.findByRole("region", { name: "Win rate" });
  expect(within(rate).getByText("60%")).toBeDefined();
  expect(within(rate).getByText("40%")).toBeDefined();
  expect(within(rate).getByText("+20 pp")).toBeDefined();
  const deaths = screen.getByRole("region", { name: "Deaths per game" });
  expect(within(deaths).getByText("0")).toBeDefined();
  expect(within(deaths).getByText("-4")).toBeDefined();
  expect(
    within(screen.getByRole("region", { name: "Average GPM" })).getByText(
      "600",
    ),
  ).toBeDefined();
  expect(
    screen.getAllByText(
      "At least 5 valid samples in each period are needed to compare.",
    ),
  ).toHaveLength(2);
  expect(screen.getByText(/101 retained matches/)).toBeDefined();
  const toggle = screen.getByRole("button", { name: "View weekly numbers" });
  await user.click(toggle);
  const table = screen.getByRole("table", { name: "Weekly match statistics" });
  expect(within(table).getAllByRole("row")).toHaveLength(9);
  expect(within(table).getAllByText("4 valid samples")).toHaveLength(8);
  expect(screen.getByText(/Current week is partial/)).toBeDefined();
});

it("retains loaded progress on refresh errors and isolates it when the user changes", async () => {
  let failing = false;
  vi.stubGlobal("fetch", async () =>
    failing
      ? Response.json(
          { error: "Storage temporarily unavailable" },
          { status: 503 },
        )
      : Response.json(
          identity.userId === "other-owner"
            ? { ...fixture, retainedMatches: 0 }
            : fixture,
        ),
  );
  const view = mount();
  await screen.findByRole("region", { name: "Win rate" });
  failing = true;
  await act(() =>
    view.client.invalidateQueries({ queryKey: getGetPlayerProgressQueryKey() }),
  );
  await screen.findByText("Storage temporarily unavailable");
  expect(screen.getByRole("region", { name: "Win rate" })).toBeDefined();
  expect(
    screen.getByText(
      "Showing previously loaded progress. Saved statistics could not be refreshed.",
    ),
  ).toBeDefined();
  failing = false;
  identity.userId = "other-owner";
  view.rerender(
    <QueryClientProvider client={view.client}>
      <MemoryRouter>
        <ProgressPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByRole("link", { name: "Import my matches" });
  await waitFor(() =>
    expect(screen.queryByRole("region", { name: "Win rate" })).toBeNull(),
  );
});
