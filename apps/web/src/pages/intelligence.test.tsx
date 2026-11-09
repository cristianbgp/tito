// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import { HeroEvidencePage } from "./hero-evidence";
import { PatchNotesPage } from "./patch-notes";
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach((c) => c.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
});
function setup(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>,
  );
}
const catalog = {
  heroes: [
    {
      id: 1,
      name: "Anti-Mage",
      image: null,
      roles: ["Carry"],
      attackType: "Melee",
      attribute: "agi",
    },
    {
      id: 2,
      name: "Axe",
      image: null,
      roles: ["Initiator"],
      attackType: "Melee",
      attribute: "str",
    },
  ],
  retrievedAt: "2026-11-07T00:00:00Z",
  source: "bundled",
  enabled: false,
};
const section = (data: unknown, status = "available") => ({
  data,
  status,
  fetchedAt: "2026-11-07T00:00:00Z",
  expiresAt: "2026-11-08T00:00:00Z",
  sourceUrl: "https://api.opendota.com/api/heroes/1/matchups",
});
const heroEvidence = {
  heroId: 1,
  catalog: section({
    id: 1,
    name: "Anti-Mage",
    image: null,
    roles: ["Carry"],
    attackType: "Melee",
    primaryAttribute: "agi",
  }),
  matchups: section([], "empty"),
  benchmarks: section(null, "unavailable"),
  itemPopularity: section([], "empty"),
  referenceCards: [
    {
      title: "Verified catalog card",
      body: "Catalog reference",
      sourceUrl: "https://api.opendota.com/api/constants/heroes",
    },
  ],
  limitations: ["No rank or patch cohort is identified."],
};
test("hero evidence loads only by request and hides the previous hero after selection changes", async () => {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: unknown) => {
    calls.push(String(url));
    return Response.json(
      String(url).includes("/intelligence/") ? heroEvidence : catalog,
    );
  });
  setup(<HeroEvidencePage />);
  await screen.findByText("Anti-Mage");
  expect(calls.filter((url) => url.includes("/intelligence/"))).toHaveLength(0);
  await userEvent.click(
    screen.getByRole("button", { name: "Load hero evidence" }),
  );
  await screen.findByText("Verified catalog card");
  expect(screen.getByText(/This source is unavailable/)).toBeTruthy();
  expect(screen.getAllByText(/Retrieved:/).length).toBeGreaterThan(0);
  await userEvent.click(screen.getByRole("combobox", { name: "Hero" }));
  await userEvent.click(await screen.findByRole("option", { name: "Axe" }));
  expect(screen.queryByText("Verified catalog card")).toBeNull();
  expect(calls.filter((url) => url.includes("/intelligence/"))).toHaveLength(1);
});
test("patch list and notes require separate actions, and version changes hide old notes", async () => {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: unknown) => {
    calls.push(String(url));
    if (String(url).includes("hero-picker")) return Response.json(catalog);
    if (String(url).endsWith("/patches"))
      return Response.json({
        ...section([
          {
            id: null,
            name: "7.41",
            releasedAt: "2026-03-24T00:00:00Z",
            sourceUrl: "https://www.dota2.com/patches/7.41",
          },
          {
            id: null,
            name: "7.40",
            releasedAt: "2025-12-16T00:00:00Z",
            sourceUrl: "https://www.dota2.com/patches/7.40",
          },
        ]),
        limitations: [],
      });
    return Response.json({
      ...section({
        version: "7.41",
        releasedAt: "2026-03-24T00:00:00Z",
        sourceUrl: "https://www.dota2.com/patches/7.41",
        heroChanges: [
          {
            heroId: 1,
            notes: [
              { kind: "hero", abilityId: null, text: "Verified armor change" },
            ],
          },
        ],
        generalChanges: [],
      }),
      limitations: [],
    });
  });
  setup(<PatchNotesPage />);
  await screen.findByRole("checkbox", { name: "Anti-Mage" });
  expect(calls.filter((url) => url.includes("/intelligence/"))).toHaveLength(0);
  await userEvent.click(
    screen.getByRole("button", { name: "Load patch list" }),
  );
  await screen.findByRole("combobox", { name: "Patch version" });
  expect(calls.filter((url) => url.includes("/intelligence/"))).toHaveLength(1);
  await userEvent.click(screen.getByRole("checkbox", { name: "Anti-Mage" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Load selected patch" }),
  );
  await screen.findByText("Verified armor change");
  expect(calls.some((url) => url.includes("heroIds=1"))).toBe(true);
  await userEvent.click(
    screen.getByRole("combobox", { name: "Patch version" }),
  );
  await userEvent.click(await screen.findByRole("option", { name: /^7\.40/ }));
  expect(screen.queryByText("Verified armor change")).toBeNull();
  expect(calls.filter((url) => url.includes("/intelligence/"))).toHaveLength(2);
});
