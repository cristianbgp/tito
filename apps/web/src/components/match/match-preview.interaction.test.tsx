// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it } from "vitest";
import { MatchPreviewContent } from "./match-preview";

afterEach(cleanup);
it("keeps the open-match action a semantic navigation link with player context", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={
            <MatchPreviewContent
              recent={{
                id: "123456",
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
              }}
            />
          }
        />
        <Route path="/matches/:id" element={<h1>Match destination</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  const link = screen.getByRole("link", { name: "Open match" });
  expect(link.getAttribute("href")).toBe("/matches/123456?player=70388657");
  link.focus();
  await user.keyboard(" ");
  expect(
    screen.queryByRole("heading", { name: "Match destination" }),
  ).toBeNull();
  await user.keyboard("{Enter}");
  expect(
    await screen.findByRole("heading", { name: "Match destination" }),
  ).toBeDefined();
});
