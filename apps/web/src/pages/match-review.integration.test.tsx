// @vitest-environment jsdom
import { StrictMode } from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { MatchPage } from "./match";
vi.mock("../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: "owner", steamId: "76561197960265770" } },
      isPending: false,
    }),
  },
}));
vi.mock("../components/library/match-notebook", () => ({
  MatchNotebook: () => (
    <section aria-label="Your match notebook">Private notebook</section>
  ),
}));
vi.mock("../components/coaching/match-follow-up", () => ({
  MatchFollowUp: () => (
    <section aria-label="Ask about this review">Review follow-up</section>
  ),
}));
vi.mock("../components/match/replay-analysis", () => ({
  ReplayAnalysis: () => null,
}));
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  for (const client of clients) client.clear();
  clients.length = 0;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
test("keeps one review and match statistics without notebook or follow-up panels while queries settle", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      await pending;
      if (url.endsWith("/review"))
        return Response.json({ enabled: true, review: null });
      if (url === "/api/profile")
        return Response.json({
          accountId: "42",
          linkedAccountId: "42",
          role: null,
          experience: null,
        });
      return Response.json({
        id: "101",
        startedAt: 1700000000,
        duration: 1800,
        winner: "radiant",
        parsed: true,
        gameMode: 22,
        lobbyType: 7,
        region: null,
        radiantScore: 30,
        direScore: 20,
        metadataAvailable: true,
        goldAdvantage: [],
        experienceAdvantage: [],
        players: [],
      });
    }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/matches/101"]}>
          <Routes>
            <Route path="/matches/:matchId" element={<MatchPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
  await act(async () => {
    release();
    await pending;
  });
  await screen.findByRole("heading", { name: "Radiant wins" });
  expect(
    screen.getAllByRole("heading", { name: "Your match review" }),
  ).toHaveLength(1);
  expect(
    screen.queryByRole("region", { name: "Your match notebook" }),
  ).toBeNull();
  expect(
    screen.queryByRole("region", { name: "Ask about this review" }),
  ).toBeNull();
  expect(
    errors.mock.calls.filter((call) =>
      /same key|duplicate key/i.test(call.map(String).join(" ")),
    ),
  ).toHaveLength(0);
});
test("starts with match statistics instead of empty AI panels when AI is disabled", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/review"))
        return Response.json({ enabled: false, review: null });
      if (url === "/api/profile")
        return Response.json({
          accountId: "42",
          linkedAccountId: "42",
          role: null,
          experience: null,
        });
      return Response.json({
        id: "101",
        startedAt: 1700000000,
        duration: 1800,
        winner: "radiant",
        parsed: true,
        gameMode: 22,
        lobbyType: 7,
        region: null,
        radiantScore: 30,
        direScore: 20,
        metadataAvailable: true,
        goldAdvantage: [],
        experienceAdvantage: [],
        players: [],
      });
    }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/matches/101"]}>
          <Routes>
            <Route path="/matches/:matchId" element={<MatchPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
  await screen.findByRole("heading", { name: "Radiant wins" });
  expect(
    screen.queryByRole("heading", { name: "Your match review" }),
  ).toBeNull();
  expect(screen.queryByText("AI reviews aren’t available yet.")).toBeNull();
  expect(screen.queryByRole("heading", { name: "Replay evidence" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Load replay evidence" }),
  ).toBeNull();
  expect(
    document
      .querySelector('.match-page [data-slot="card"]')
      ?.getAttribute("aria-label"),
  ).toBe("Match overview");
  expect(
    screen.queryByRole("region", { name: "Your match notebook" }),
  ).toBeNull();
  expect(
    screen.queryByRole("region", { name: "Ask about this review" }),
  ).toBeNull();
});
