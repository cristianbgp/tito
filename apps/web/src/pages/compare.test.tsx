// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import type {
  RecentMatch,
  SavedHistory,
  MatchEvidence,
} from "../api/generated/models";
import { ComparePage } from "./compare";
const state = vi.hoisted(() => ({
  userId: "owner",
  steamId: "76561197960265770" as string | null,
  signedIn: true,
}));
vi.mock("../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: state.signedIn
        ? { user: { id: state.userId, steamId: state.steamId } }
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
  state.userId = "owner";
  state.steamId = "76561197960265770";
  state.signedIn = true;
});
const game = (id: string, extra: Partial<RecentMatch> = {}): RecentMatch => ({
  id,
  accountId: "42",
  heroId: 1,
  hero: "Anti-Mage",
  heroImage: null,
  result: "win",
  startedAt: 1700000000,
  duration: 1800,
  kills: 0,
  deaths: null,
  assists: 2,
  goldPerMinute: 500,
  experiencePerMinute: null,
  gameMode: 22,
  patch: 60,
  actualRole: null,
  ...extra,
});
const games = [
  game("101"),
  game("102", {
    heroId: 2,
    hero: "Axe",
    kills: null,
    gameMode: 1,
    patch: 59,
    duration: 2400,
  }),
  game("103", { hero: "Third match" }),
];
const history = (matches = games): SavedHistory => ({
  accountId: "42",
  matches,
  total: matches.length,
  lastSyncedAt: "2026-11-07T00:00:00Z",
  nextSyncAt: null,
  hasOlder: false,
  retentionLimit: 1000,
  importSize: 100,
});
function evidence(id: string, own = true): MatchEvidence {
  return {
    matchId: id,
    parsed: true,
    coverage: { purchases: true, minuteSamples: true, moments: false },
    players: [
      {
        slot: 0,
        heroId: 2,
        accountId: "99",
        itemTimings: [
          {
            time: 0,
            key: "other",
            itemId: 99,
            name: "Unrelated player purchase",
            image: null,
          },
        ],
        minuteSamples: [],
      },
      ...(own
        ? [
            {
              slot: 128,
              heroId: 1,
              accountId: "42",
              itemTimings: [
                {
                  time: id === "101" ? 0 : 30,
                  key: "blink",
                  itemId: 1,
                  name: "Own Blink Dagger",
                  image: null,
                },
              ],
              minuteSamples:
                id === "101"
                  ? [
                      { time: 0, gold: 0, experience: null, lastHits: null },
                      { time: 60, gold: 50, experience: 100, lastHits: 1 },
                      { time: 120, gold: 100, experience: 300, lastHits: 2 },
                    ]
                  : [
                      { time: 0, gold: 0, experience: null, lastHits: null },
                      { time: 90, gold: 70, experience: 110, lastHits: 2 },
                      { time: 120, gold: null, experience: 400, lastHits: 3 },
                    ],
            },
          ]
        : []),
    ],
    moments: [],
    limitations: [],
    sourceUrl: `https://www.opendota.com/matches/${id}`,
  };
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ComparePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function stub(own = true) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: unknown) => {
    calls.push(String(url));
    if (String(url).startsWith("/api/history"))
      return Response.json(state.userId === "owner" ? history() : history([]));
    return Response.json(evidence(String(url).split("/").pop()!, own));
  });
  return calls;
}

test("comparison uses own saved history, preserves zero versus unknown and explains differing contexts", async () => {
  const calls = stub();
  mount();
  await screen.findByRole("combobox", { name: "Match A" });
  expect(calls).toHaveLength(1);
  expect(calls[0]).toContain("/api/history?limit=1000");
  const row = screen.getByRole("rowheader", { name: "Kills" }).closest("tr")!;
  expect(
    within(row)
      .getAllByRole("cell")
      .map((cell) => cell.textContent),
  ).toEqual(["0", "Unknown", "Unknown"]);
  expect(
    screen.getByText("These matches used different game modes."),
  ).toBeTruthy();
  expect(
    screen.getByText("These matches were played on different patches."),
  ).toBeTruthy();
  expect(calls.some((url) => url.includes("intelligence"))).toBe(false);
});
test("explicit replay comparison chooses only own player and aligns observed timestamps without filling gaps", async () => {
  const calls = stub();
  mount();
  await screen.findByRole("combobox", { name: "Match A" });
  await userEvent.click(
    screen.getByRole("button", { name: "Load both replay records" }),
  );
  await screen.findByText("Own Blink Dagger");
  expect(screen.queryByText("Unrelated player purchase")).toBeNull();
  expect(calls.filter((url) => url.includes("intelligence"))).toHaveLength(2);
  const sampleSection = screen
    .getByRole("heading", { name: "Observed minute comparison" })
    .closest("section")!;
  const rows = within(sampleSection).getAllByRole("row");
  expect(rows).toHaveLength(2);
  expect(
    within(rows[1]!)
      .getAllByRole("cell")
      .map((cell) => cell.textContent),
  ).toEqual(["0", "0", "0"]);
  expect(within(sampleSection).queryByText("1:00")).toBeNull();
  expect(within(sampleSection).queryByText("1:30")).toBeNull();
  await userEvent.click(
    screen.getByRole("combobox", { name: "Timeline metric" }),
  );
  await userEvent.click(
    await screen.findByRole("option", { name: "Experience" }),
  );
  expect(
    within(sampleSection).getByRole("rowheader", { name: "2:00" }),
  ).toBeTruthy();
  expect(calls.filter((url) => url.includes("intelligence"))).toHaveLength(2);
  await userEvent.click(screen.getByRole("combobox", { name: "Match B" }));
  await userEvent.click(
    await screen.findByRole("option", { name: /^Third match/ }),
  );
  expect(screen.queryByText("Own Blink Dagger")).toBeNull();
  expect(
    screen.queryByRole("combobox", { name: "Timeline metric" }),
  ).toBeNull();
  expect(calls.filter((url) => url.includes("intelligence"))).toHaveLength(2);
});
test("missing own replay identity cannot substitute another player", async () => {
  stub(false);
  mount();
  await screen.findByRole("combobox", { name: "Match A" });
  await userEvent.click(
    screen.getByRole("button", { name: "Load both replay records" }),
  );
  await screen.findByText(/Your player could not be identified/);
  expect(screen.queryByText("Unrelated player purchase")).toBeNull();
  expect(
    screen.queryByRole("heading", { name: "First recorded item purchases" }),
  ).toBeNull();
});
test("sign-out or switching verified Steam identity hides prior saved comparisons", async () => {
  const calls = stub();
  const view = mount();
  await screen.findByRole("combobox", { name: "Match A" });
  state.userId = "other";
  state.steamId = "76561197960265771";
  view.rerender(
    <QueryClientProvider client={clients[0]!}>
      <MemoryRouter>
        <ComparePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(screen.queryByRole("combobox", { name: "Match A" })).toBeNull();
  await screen.findByText(/Import at least two matches/);
  expect(calls.filter((url) => url.includes("/api/history"))).toHaveLength(2);
  state.signedIn = false;
  view.rerender(
    <QueryClientProvider client={clients[0]!}>
      <MemoryRouter>
        <ComparePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy(),
  );
  expect(screen.queryByText("Saved match summaries")).toBeNull();
  expect(calls).toHaveLength(2);
});
