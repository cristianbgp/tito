// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import type { RecentMatch } from "../api/generated/models";
import {
  getGetRecentMatchesQueryKey,
  getGetMatchQueryKey,
} from "../api/generated/tito";
import { MatchesPage } from "./matches";
import { MatchPage } from "./match";

const games: RecentMatch[] = [
  {
    id: "101",
    accountId: "42",
    heroId: 1,
    hero: "Anti-Mage",
    heroImage: null,
    result: "win",
    startedAt: 300,
    duration: 1800,
    kills: 3,
    deaths: 1,
    assists: 4,
    goldPerMinute: 600,
    experiencePerMinute: null,
  },
  {
    id: "102",
    accountId: "42",
    heroId: 39,
    hero: "Queen of Pain",
    heroImage: null,
    result: "loss",
    startedAt: 200,
    duration: 2400,
    kills: 9,
    deaths: 6,
    assists: 4,
    goldPerMinute: 400,
    experiencePerMinute: 500,
  },
  {
    id: "103",
    accountId: "42",
    heroId: 1,
    hero: "Anti-Mage",
    heroImage: null,
    result: null,
    startedAt: 100,
    duration: 1200,
    kills: null,
    deaths: null,
    assists: null,
    goldPerMinute: null,
    experiencePerMinute: 700,
  },
];
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
});
function setup(url = "/?player=42", matches = games) {
  vi.stubGlobal("fetch", async (url: unknown) =>
    String(url).includes("/players/")
      ? Response.json(
          { error: "OpenDota is temporarily unavailable. Try again shortly." },
          { status: 502 },
        )
      : Response.json(null),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  clients.push(client);
  client.setQueryData(getGetRecentMatchesQueryKey("42"), matches);
  for (const game of matches)
    client.setQueryData(getGetMatchQueryKey(game.id), {
      id: game.id,
      startedAt: game.startedAt,
      duration: game.duration,
      winner: null,
      parsed: false,
      gameMode: null,
      lobbyType: null,
      region: null,
      radiantScore: null,
      direScore: null,
      metadataAvailable: true,
      goldAdvantage: [],
      experienceAdvantage: [],
      players: [],
    });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/" element={<MatchesPage />} />
          <Route path="/matches/:matchId" element={<MatchPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

it("keeps multiword search and sort context when opening a match and returning", async () => {
  const user = setup("/?player=42&sort=oldest");
  const search = screen.getByRole("searchbox", { name: "Hero or match ID" });
  await user.type(search, "Queen of Pain");
  expect((search as HTMLInputElement).value).toBe("Queen of Pain");
  const table = screen.getByRole("table", { name: "Recent matches" });
  expect(within(table).getAllByRole("row")).toHaveLength(2);
  const open = screen.getByRole("link", { name: "Open match" });
  expect(open.getAttribute("href")).toBe(
    "/matches/102?player=42&hero=Queen+of+Pain&sort=oldest",
  );
  await user.click(open);
  const back = await screen.findByRole("link", { name: "← Back to matches" });
  expect(back.getAttribute("href")).toBe(
    "/?player=42&hero=Queen+of+Pain&sort=oldest",
  );
  await user.click(back);
  expect(
    (
      (await screen.findByRole("searchbox", {
        name: "Hero or match ID",
      })) as HTMLInputElement
    ).value,
  ).toBe("Queen of Pain");
  expect(
    screen.getByText("Based on 3 available recent matches, before filters."),
  ).toBeDefined();
});

it("filters by queue and mode, retains them through navigation, and resets both", async () => {
  const user = setup("/?player=42", [
    { ...games[0], gameMode: 22, lobbyType: 7 },
    { ...games[1], gameMode: 4, lobbyType: 0 },
    { ...games[2], gameMode: 23, lobbyType: 0 },
  ]);
  await user.click(screen.getByRole("combobox", { name: "Queue" }));
  await user.click(await screen.findByRole("option", { name: /^Ranked$/ }));
  const table = screen.getByRole("table", { name: "Recent matches" });
  expect(within(table).getAllByRole("row")).toHaveLength(2);
  expect(
    screen.getByRole("link", { name: "Open match" }).getAttribute("href"),
  ).toBe("/matches/101?player=42&queue=ranked");
  await user.click(screen.getByRole("button", { name: "Reset view" }));
  await user.click(screen.getByRole("combobox", { name: "Game mode" }));
  await user.click(
    await screen.findByRole("option", { name: /^Single Draft$/ }),
  );
  await user.click(screen.getByRole("combobox", { name: "Queue" }));
  await user.click(
    await screen.findByRole("option", {
      name: /^Unranked matchmaking$/,
    }),
  );
  const open = screen.getByRole("link", { name: "Open match" });
  expect(open.getAttribute("href")).toBe(
    "/matches/102?player=42&queue=normal&gameMode=4",
  );
  await user.click(open);
  await user.click(
    await screen.findByRole("link", { name: "← Back to matches" }),
  );
  expect(
    screen.getByRole("combobox", { name: "Game mode" }).textContent,
  ).toContain("Single Draft");
  expect(screen.getByRole("combobox", { name: "Queue" }).textContent).toContain(
    "Unranked matchmaking",
  );
  expect(
    within(screen.getByRole("table", { name: "Recent matches" })).getAllByRole(
      "row",
    ),
  ).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "Reset view" }));
  expect(
    within(screen.getByRole("table", { name: "Recent matches" })).getAllByRole(
      "row",
    ),
  ).toHaveLength(4);
});

it("drops hidden selections, resets an empty view, and retains data when refresh fails", async () => {
  const user = setup();
  await user.click(
    screen.getByRole("button", { name: "Preview Queen of Pain match" }),
  );
  await user.click(screen.getByRole("combobox", { name: "Result" }));
  await user.click(await screen.findByRole("option", { name: "Victory" }));
  expect(screen.getByRole("heading", { name: "Anti-Mage" })).toBeDefined();
  await user.type(
    screen.getByRole("searchbox", { name: "Hero or match ID" }),
    "not a hero",
  );
  expect(
    screen.getByRole("heading", { name: "No matches fit this view" }),
  ).toBeDefined();
  expect(
    screen.queryByRole("complementary", { name: "Selected match" }),
  ).toBeNull();
  await user.click(screen.getByRole("button", { name: "Reset view" }));
  expect(
    within(screen.getByRole("table", { name: "Recent matches" })).getAllByRole(
      "row",
    ),
  ).toHaveLength(4);
  await user.click(screen.getByRole("button", { name: "Refresh matches" }));
  expect(
    await screen.findByText(
      "Showing previously loaded matches. Live updates are temporarily unavailable.",
    ),
  ).toBeDefined();
  expect(
    within(screen.getByRole("table", { name: "Recent matches" })).getAllByRole(
      "row",
    ),
  ).toHaveLength(4);
});

it("uses the full recent sample for hero performance and links a hero back to its games", async () => {
  const user = setup();
  const heroTable = screen.getByRole("table", {
    name: "Recent hero performance",
  });
  const antiMage = within(heroTable).getByRole("row", {
    name: /Show Anti-Mage games/,
  });
  expect(within(antiMage).getByText("100%")).toBeDefined();
  expect(within(antiMage).getByText("600")).toBeDefined();
  expect(within(antiMage).getByText("700")).toBeDefined();
  await user.click(screen.getByRole("link", { name: "Show Anti-Mage games" }));
  expect(
    (
      screen.getByRole("searchbox", {
        name: "Hero or match ID",
      }) as HTMLInputElement
    ).value,
  ).toBe("Anti-Mage");
  expect(
    within(screen.getByRole("table", { name: "Recent matches" })).getAllByRole(
      "row",
    ),
  ).toHaveLength(3);
  expect(within(heroTable).getAllByRole("row")).toHaveLength(3);
});

it("drills into an exact hero even when the hero catalog only supplies fallback names", async () => {
  const fallback = games.map((game, index) => ({
    ...game,
    heroId: [1, 10, 11][index],
    hero: `Hero ${[1, 10, 11][index]}`,
  }));
  const user = setup("/?player=42", fallback);
  await user.click(screen.getByRole("link", { name: "Show Hero 1 games" }));
  expect(
    within(screen.getByRole("table", { name: "Recent matches" })).getAllByRole(
      "row",
    ),
  ).toHaveLength(2);
});
