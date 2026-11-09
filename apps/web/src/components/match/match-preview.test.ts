import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { MatchPreviewContent } from "./match-preview";

const match = {
  id: "9080700056",
  accountId: "70388657",
  heroId: 109,
  hero: "Terrorblade",
  heroImage: null,
  result: "win" as const,
  startedAt: 1794078000,
  duration: 1643,
  kills: 3,
  deaths: 1,
  assists: 4,
  goldPerMinute: 834,
  experiencePerMinute: 763,
};
it("keeps the selected match actionable and does not invent a missing timeline", () => {
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      {},
      createElement(MatchPreviewContent, { recent: match }),
    ),
  );
  expect(html).toContain("Terrorblade");
  expect(html).toContain("Victory");
  expect(html).toContain("/matches/9080700056?player=70388657");
  expect(html).toContain("Gold timeline is unavailable");
  expect(html).toContain("834");
  expect(html).not.toContain('class="advantage-plot"');
});
