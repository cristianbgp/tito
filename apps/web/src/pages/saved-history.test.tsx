// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { MatchesPage } from "./matches";
import { getGetPlayerProgressQueryKey } from "../api/generated/tito";
import type { RecentMatch, SavedHistory } from "../api/generated/models";

const state = vi.hoisted(() => ({
  userId: "owner",
  steamId: "76561197960265770" as string | null,
}));
vi.mock("../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: state.userId, steamId: state.steamId } },
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
  state.userId = "owner";
  state.steamId = "76561197960265770";
});
const game = (id: string, hero = "Anti-Mage"): RecentMatch => ({
  id,
  accountId: "42",
  heroId: 1,
  hero,
  heroImage: null,
  startedAt: 1700000000,
  duration: 1800,
  result: "win",
  kills: 4,
  deaths: 2,
  assists: 8,
  goldPerMinute: 500,
  experiencePerMinute: null,
});
const snapshot = (matches: RecentMatch[]): SavedHistory => ({
  accountId: "42",
  matches,
  total: matches.length,
  lastSyncedAt: matches.length ? "2026-11-07T20:00:00.000Z" : null,
  nextSyncAt: null,
  hasOlder: true,
  retentionLimit: 1000,
  importSize: 100,
});
function mount(path = "/") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <MatchesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function stubData(initial: SavedHistory) {
  let saved = initial;
  let failSync = false;
  const actions: string[] = [];
  const requests: string[] = [];
  vi.stubGlobal("fetch", async (value: unknown, init?: RequestInit) => {
    const url = new URL(String(value), "https://tito.localhost");
    requests.push(url.pathname);
    if (url.pathname === "/api/profile")
      return Response.json({
        accountId: "42",
        linkedAccountId: state.steamId ? "42" : null,
        role: null,
        experience: null,
      });
    if (url.pathname === "/api/history/sync") {
      const { mode } = JSON.parse(String(init?.body));
      actions.push(mode);
      if (failSync)
        return Response.json(
          { error: "OpenDota is temporarily unavailable." },
          { status: 502 },
        );
      saved = snapshot(
        mode === "older"
          ? [...saved.matches, game("8", "Older hero")]
          : [game("9")],
      );
      return Response.json(saved);
    }
    if (url.pathname === "/api/history")
      return Response.json({
        ...(state.userId === "other-owner" ? snapshot([]) : saved),
        matches: (state.userId === "other-owner" ? [] : saved.matches).slice(
          0,
          Number(url.searchParams.get("limit") ?? 100),
        ),
      });
    if (url.pathname.includes("/players/"))
      return Response.json([game("7", "Public hero")]);
    if (url.pathname.startsWith("/api/matches/"))
      return Response.json({
        id: url.pathname.split("/").pop(),
        startedAt: 1700000000,
        duration: 1800,
        winner: null,
        parsed: false,
        gameMode: null,
        lobbyType: null,
        region: null,
        radiantScore: null,
        direScore: null,
        metadataAvailable: false,
        goldAdvantage: [],
        experienceAdvantage: [],
        players: [],
      });
    return Response.json(null);
  });
  return {
    actions,
    requests,
    fail: () => {
      failSync = true;
    },
  };
}

it("imports only on request, loads older games explicitly, and preserves saved rows on provider failure", async () => {
  const user = userEvent.setup();
  const fixture = stubData(snapshot([]));
  mount();
  const progressKey = [
    ...getGetPlayerProgressQueryKey(),
    "owner",
    state.steamId,
  ];
  clients[0].setQueryData(progressKey, { retainedMatches: 0 });
  await screen.findByRole("button", { name: "Import my matches" });
  expect(fixture.actions).toEqual([]);
  expect(fixture.requests.some((path) => path.includes("/players/"))).toBe(
    false,
  );
  await user.click(screen.getByRole("button", { name: "Import my matches" }));
  await screen.findByRole("button", { name: "Sync new matches" });
  expect(fixture.actions).toEqual(["latest"]);
  expect(clients[0].getQueryState(progressKey)?.isInvalidated).toBe(true);
  expect(
    fixture.requests.some((path) => path.startsWith("/api/matches/")),
  ).toBe(false);
  await user.click(screen.getByRole("button", { name: "Load older matches" }));
  await waitFor(() =>
    expect(screen.getAllByText("Older hero").length).toBeGreaterThan(0),
  );
  expect(fixture.actions).toEqual(["latest", "older"]);
  fixture.fail();
  await user.click(screen.getByRole("button", { name: "Sync new matches" }));
  await screen.findByText("OpenDota is temporarily unavailable.");
  expect(screen.getAllByText("Older hero").length).toBeGreaterThan(0);
});

it("renders persisted history after a fresh mount without a provider sync and offers more saved rows", async () => {
  const user = userEvent.setup();
  const data = snapshot(
    Array.from({ length: 101 }, (_, i) =>
      game(String(1000 - i), i === 100 ? "Previously saved hero" : "Anti-Mage"),
    ),
  );
  const fixture = stubData(data);
  const view = mount();
  await screen.findByRole("button", { name: "Show more saved matches" });
  expect(fixture.actions).toEqual([]);
  expect(screen.queryByText("Previously saved hero")).toBeNull();
  await user.click(
    screen.getByRole("button", { name: "Show more saved matches" }),
  );
  await waitFor(() =>
    expect(screen.getAllByText("Previously saved hero").length).toBeGreaterThan(
      0,
    ),
  );
  expect(fixture.actions).toEqual([]);
  view.unmount();
  mount();
  await screen.findByRole("button", { name: "Sync new matches" });
  expect(fixture.actions).toEqual([]);
});

it("keeps other players and manual IDs as public lookups without saving them", async () => {
  const fixture = stubData(snapshot([game("9")]));
  mount("/?player=99");
  await waitFor(() =>
    expect(screen.getAllByText("Public hero").length).toBeGreaterThan(0),
  );
  expect(screen.queryByRole("button", { name: "Sync new matches" })).toBeNull();
  expect(fixture.requests).not.toContain("/api/history");
  expect(fixture.actions).toEqual([]);
  expect(
    screen.getByRole("link", { name: "My saved history" }).getAttribute("href"),
  ).toBe("/?player=42");
});

it("keeps an unverified manual profile ID as a public lookup", async () => {
  state.steamId = null;
  const fixture = stubData(snapshot([game("9")]));
  mount();
  await waitFor(() =>
    expect(screen.getAllByText("Public hero").length).toBeGreaterThan(0),
  );
  expect(fixture.requests).not.toContain("/api/history");
  expect(
    screen.queryByRole("button", { name: "Import my matches" }),
  ).toBeNull();
});

it("isolates saved query data when the signed-in user changes", async () => {
  stubData(snapshot([game("9")]));
  const view = mount();
  await screen.findByRole("button", { name: "Sync new matches" });
  expect(screen.getAllByText("Anti-Mage").length).toBeGreaterThan(0);
  state.userId = "other-owner";
  view.rerender(
    <QueryClientProvider client={clients[0]}>
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByRole("heading", { name: "Your history starts here." });
  expect(screen.queryByText("Anti-Mage")).toBeNull();
  expect(screen.queryByRole("button", { name: "Sync new matches" })).toBeNull();
});

it("shows the completed sync response without another 100-row history read", async () => {
  const user = userEvent.setup();
  const fixture = stubData(snapshot([game("8")]));
  mount();
  await screen.findByRole("button", { name: "Sync new matches" });
  const reads = fixture.requests.filter(
    (path) => path === "/api/history",
  ).length;
  await user.click(screen.getByRole("button", { name: "Sync new matches" }));
  await screen.findByRole("link", { name: "Open Anti-Mage match" });
  await waitFor(() =>
    expect(
      clients[0].getQueryData(["saved-history", "owner", "42", 100]),
    ).toMatchObject({ matches: [{ id: "9" }] }),
  );
  expect(
    fixture.requests.filter((path) => path === "/api/history").length,
  ).toBe(reads);
});
