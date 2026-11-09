// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test } from "vitest";
import { ToolsPage } from "./tools";
afterEach(cleanup);
test("keeps the hub focused on four standalone tools", () => {
  render(
    <MemoryRouter>
      <ToolsPage />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole("link")).toHaveLength(4);
  for (const path of ["hero-picker", "pools", "compare", "reference"])
    expect(document.querySelector(`a[href="/tools/${path}"]`)).not.toBeNull();
  for (const path of [
    "coaching",
    "heroes",
    "journal",
    "drafts",
    "session",
    "patches",
    "usage",
    "local-game",
    "install",
  ])
    expect(document.querySelector(`a[href="/tools/${path}"]`)).toBeNull();
});
