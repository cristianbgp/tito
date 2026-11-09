// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { MatchReview } from "./match-review";
import {
  getGetMatchReviewQueryKey,
  getGetPersonalHeroesQueryKey,
  getGetPersonalHeroQueryKey,
  getGetSessionReflectionQueryKey,
  getGetPersonalAiUsageQueryKey,
  getGetCoachingQueryKey,
} from "../../api/generated/tito";
import type { SavedMatchReview } from "../../api/generated/models";
vi.mock("../../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: "one", steamId: "42" } },
      isPending: false,
    }),
  },
}));
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
});
const saved: SavedMatchReview = {
  matchId: "900",
  generatedAt: "2026-11-07T00:00:00Z",
  model: "controlled",
  promptVersion: "test",
  context: {
    hero: "Crystal Maiden",
    coverage: "summary",
    comparableGames: 0,
    facts: [],
  },
  content: {
    summary: "Previously generated review",
    wentWell: [],
    wentWrong: [],
    improve: [
      { title: "Replay", action: "Watch the opening", evidenceIds: [] },
    ],
  },
};
const updated = {
  ...saved,
  generatedAt: "2026-11-07T01:00:00Z",
  content: { ...saved.content, summary: "Newly generated review" },
};
function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  clients.push(client);
  client.setQueryData([...getGetMatchReviewQueryKey("900"), "one", "42"], {
    enabled: true,
    review: saved,
  });
  return client;
}
const mount = (client: QueryClient) =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MatchReview matchId="900" userId="one" steamId="42" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
it("never displays cached feedback from a previous review while new-version feedback fails to load", async () => {
  const client = setup(),
    user = userEvent.setup();
  let generated = false;
  vi.stubGlobal("fetch", async (value: unknown, init?: RequestInit) => {
    if (init?.method === "POST") {
      generated = true;
      return Response.json({ enabled: true, review: updated });
    }
    if (String(value).includes("/feedback/")) {
      if (generated)
        return Response.json(
          { error: "Feedback unavailable" },
          { status: 503 },
        );
      return Response.json({
        feedback: {
          rating: "incorrect",
          comment: "Old review-only comment",
          updatedAt: "2026-11-07T00:10:00Z",
        },
      });
    }
    return Response.json({ enabled: true, review: saved });
  });
  mount(client);
  await screen.findByDisplayValue("Old review-only comment");
  await user.click(screen.getByRole("button", { name: "Check for updates" }));
  await screen.findByText("Newly generated review");
  expect(screen.queryByDisplayValue("Old review-only comment")).toBeNull();
  await screen.findByText("Feedback unavailable");
  expect(screen.queryByDisplayValue("Old review-only comment")).toBeNull();
});
it("invalidates own dependent saved summaries and usage after generation, preserving other accounts", async () => {
  const client = setup(),
    user = userEvent.setup();
  const bases = [
    getGetPersonalHeroesQueryKey(),
    getGetPersonalHeroQueryKey(5),
    getGetSessionReflectionQueryKey({ mode: "day", day: "2026-11-07" }),
    getGetPersonalAiUsageQueryKey(),
    getGetCoachingQueryKey(),
  ];
  const own = bases.map((base) => [...base, "one", "42"]),
    other = bases.map((base) => [...base, "two", "99"]);
  for (const key of [...own, ...other])
    client.setQueryData(key, { cached: true });
  vi.stubGlobal("fetch", async (value: unknown, init?: RequestInit) =>
    init?.method === "POST"
      ? Response.json({ enabled: true, review: updated })
      : String(value).includes("/feedback/")
        ? Response.json({ feedback: null })
        : Response.json({ enabled: true, review: saved }),
  );
  mount(client);
  await user.click(screen.getByRole("button", { name: "Check for updates" }));
  await screen.findByText("Newly generated review");
  await waitFor(() => {
    for (const key of own)
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });
  for (const key of other)
    expect(client.getQueryState(key)?.isInvalidated).toBe(false);
});
it("refreshes usage estimates after a failed attempt without discarding saved content", async () => {
  const client = setup(),
    user = userEvent.setup();
  const usageKey = [...getGetPersonalAiUsageQueryKey(), "one", "42"],
    heroesKey = [...getGetPersonalHeroesQueryKey(), "one", "42"];
  client.setQueryData(usageKey, { cached: true });
  client.setQueryData(heroesKey, { cached: true });
  vi.stubGlobal("fetch", async (value: unknown, init?: RequestInit) =>
    init?.method === "POST"
      ? Response.json(
          { error: "Generation failed after reservation" },
          { status: 502 },
        )
      : String(value).includes("/feedback/")
        ? Response.json({ feedback: null })
        : Response.json({ enabled: true, review: saved }),
  );
  mount(client);
  await user.click(screen.getByRole("button", { name: "Check for updates" }));
  await screen.findByText("Generation failed after reservation");
  expect(screen.getByText("Previously generated review")).toBeTruthy();
  await waitFor(() =>
    expect(client.getQueryState(usageKey)?.isInvalidated).toBe(true),
  );
  expect(client.getQueryState(heroesKey)?.isInvalidated).toBe(false);
});
