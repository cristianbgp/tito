import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { MatchDetail, MatchPlayer } from "../../api/generated/models";
import { MatchDetails } from "./match-details";
import { AdvantageChart } from "./advantage-chart";
import { chartGeometry } from "./chart-geometry";
import { MatchesPage } from "../../pages/matches";
import { getGetRecentMatchesQueryKey } from "../../api/generated/tito";

const emptySlot = { id: 0, name: null, image: null };
const player: MatchPlayer = {
  heroId: 1,
  hero: "Anti-Mage",
  heroImage: null,
  slot: 128,
  accountId: "70388657",
  name: "Player <one>",
  team: "dire",
  kills: 8,
  deaths: 3,
  assists: 12,
  level: 22,
  lastHits: 240,
  denies: 9,
  netWorth: 19000,
  goldPerMinute: 600,
  experiencePerMinute: 700,
  heroDamage: 23000,
  heroHealing: 0,
  towerDamage: 4000,
  inventory: [
    { id: 1, name: "Blink Dagger", image: null },
    emptySlot,
    { id: null, name: null, image: null },
    { id: 9999, name: null, image: null },
    emptySlot,
    emptySlot,
  ],
  backpack: [emptySlot, emptySlot, emptySlot],
  neutralItem: emptySlot,
  neutralEnhancement: emptySlot,
};
const match: MatchDetail = {
  id: "123456789",
  startedAt: 1700000000,
  duration: 2400,
  winner: "dire",
  parsed: true,
  gameMode: 22,
  lobbyType: 7,
  region: "US WEST",
  radiantScore: 0,
  direScore: 15,
  metadataAvailable: true,
  goldAdvantage: [
    { time: 0, value: 0 },
    { time: 60, value: -2000 },
  ],
  experienceAdvantage: [],
  players: [player],
};
const render = (
  viewerAccountId?: string,
  data = match,
  selectedAccountId?: string,
) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      {},
      createElement(MatchDetails, {
        match: data,
        viewerAccountId,
        selectedAccountId,
      }),
    ),
  );

describe("rich match presentation", () => {
  it("carries canonical player context from a SteamID64 search into match links", () => {
    const client = new QueryClient();
    client.setQueryData(getGetRecentMatchesQueryKey("76561198030654385"), [
      {
        id: "123456789",
        accountId: "70388657",
        heroId: 1,
        hero: "Anti-Mage",
        heroImage: null,
        result: "win",
        startedAt: 1700000000,
        duration: 2400,
        kills: 8,
        deaths: 3,
        assists: 12,
        goldPerMinute: 600,
        experiencePerMinute: 700,
      },
    ]);
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          MemoryRouter,
          { initialEntries: ["/?player=76561198030654385"] },
          createElement(MatchesPage),
        ),
      ),
    );
    expect(html).toContain("/matches/123456789?player=70388657");
    client.clear();
  });
  it("shows scoreboard, item names, overview, and exact profile identification", () => {
    const html = render("70388657");
    expect(html).toContain("Your player");
    expect(html).toContain("Player &lt;one&gt;");
    expect(html).toContain("Blink Dagger");
    expect(html).toContain("Empty slot");
    expect(html).toContain("Slot data unavailable");
    expect(html).toContain("Unknown item #9999");
    expect(html).toContain("All Pick");
    expect(html).toContain("US WEST");
    expect(html).toContain("Hero damage");
    expect(html).toContain("Gold advantage");
  });
  it("never labels other or anonymous players as the viewer", () => {
    expect(render("123")).not.toContain("Your player</span>");
    expect(
      render(undefined, {
        ...match,
        players: [{ ...player, accountId: null }],
      }),
    ).not.toContain("Your player</span>");
    const selected = render("123", match, "70388657");
    expect(selected).toContain("Selected player");
    expect(selected).not.toContain("Your player</span>");
  });
  it("explains unavailable replay series without drawing fabricated charts", () => {
    const html = render(undefined, {
      ...match,
      parsed: false,
      goldAdvantage: [],
    });
    expect(html).toContain("Gold and XP timelines are unavailable");
    expect(html).not.toContain('class="advantage-plot"');
  });
});

describe("advantage graphs", () => {
  it("preserves gaps and uses actual sample times for the horizontal position", () => {
    const model = chartGeometry([
      { time: 0, value: -100 },
      { time: 60, value: null },
      { time: 180, value: 100 },
    ]);
    expect(model.paths).toHaveLength(2);
    expect(model.x(90)).toBeCloseTo((model.x(0) + model.x(180)) / 2);
    expect(model.y(100)).toBeLessThan(model.y(-100));
  });
  it("handles all-zero and single-point matches without invalid coordinates", () => {
    const model = chartGeometry([{ time: 0, value: 0 }]);
    expect(Number.isFinite(model.x(0))).toBe(true);
    expect(Number.isFinite(model.y(0))).toBe(true);
    expect(model.paths.join(" ")).not.toMatch(/NaN|Infinity/);
  });
  it("provides a keyboard minute selector and numeric data with correct lead direction", () => {
    const html = renderToStaticMarkup(
      createElement(AdvantageChart, {
        title: "Gold advantage",
        points: [
          { time: 0, value: 0 },
          { time: 60, value: -2000 },
        ],
      }),
    );
    expect(html).toContain('type="range"');
    expect(html).toContain("Dire");
    expect(html).toContain("2,000");
    expect(html).toContain("View timeline data");
    expect(html).toContain("1:00");
  });
});
