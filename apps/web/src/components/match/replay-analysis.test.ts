import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { ReplayAnalysisView } from "./replay-analysis";

const render = (
  state: "idle" | "queued" | "waiting" | "unavailable",
  signedIn = true,
) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      {},
      createElement(ReplayAnalysisView, {
        matchId: "123456789",
        state,
        signedIn,
        onRequest: () => {},
        onCheck: () => {},
      }),
    ),
  );

it("offers a concrete replay action for signed-in players and explains the upstream limitation", () => {
  const html = render("idle");
  expect(html).toContain("Request replay analysis");
  expect(html).toContain("OpenDota has basic match stats");
  expect(html).toContain("older replays may have expired");
});
it("requires signing in instead of offering an anonymous parsing action", () => {
  const html = render("idle", false);
  expect(html).toContain("Sign in to request analysis");
  expect(html).not.toContain("<button");
});
it("shows waiting and unsuccessful analysis without claiming timelines are ready", () => {
  expect(render("queued")).toContain("Analysis requested");
  expect(render("waiting")).toContain("Check progress");
  expect(render("unavailable")).toContain(
    "OpenDota could not provide all requested replay data",
  );
  expect(render("unavailable")).not.toContain("Analysis ready");
});
