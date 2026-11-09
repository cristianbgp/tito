// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { MatchReview, MatchReviewView } from "./match-review";
import type { SavedMatchReview } from "../../api/generated/models";
import { getGetMatchReviewQueryKey } from "../../api/generated/tito";
import { StrictMode } from "react";

const saved: SavedMatchReview = {
  matchId: "900",
  generatedAt: "2026-11-07T16:00:00Z",
  model: "test",
  promptVersion: "match-review-v1",
  context: {
    hero: "Anti-Mage",
    coverage: "summary",
    comparableGames: 0,
    facts: [
      {
        id: "match.deaths",
        metric: "deaths",
        value: 0,
        source: "match",
        samples: 1,
        atSeconds: null,
      },
    ],
  },
  content: {
    summary: "A match worth a closer look.",
    wentWell: [
      {
        title: "Survival",
        interpretation: "No recorded deaths.",
        evidenceIds: ["match.deaths"],
        certainty: "observed",
      },
    ],
    wentWrong: [],
    improve: [
      {
        title: "Check your impact",
        action: "Review your next safe objective opportunity.",
        evidenceIds: ["match.deaths"],
      },
    ],
  },
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("omits an empty review section while availability loads and when AI is disabled", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let finish!: (value: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  const fetcher = vi.fn(async () => (await pending).clone());
  vi.stubGlobal("fetch", fetcher);
  render(
    <StrictMode>
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <MatchReview matchId="900" userId="one" steamId="verified" />
        </QueryClientProvider>
      </MemoryRouter>
    </StrictMode>,
  );
  expect(
    screen.queryByRole("heading", { name: "Your match review" }),
  ).toBeNull();
  await act(async () => {
    finish(Response.json({ enabled: false, review: null }));
    await pending;
  });
  await waitFor(() =>
    expect(
      client.getQueryData([
        ...getGetMatchReviewQueryKey("900"),
        "one",
        "verified",
      ]),
    ).toMatchObject({ enabled: false }),
  );
  expect(screen.queryByText("Loading your saved review…")).toBeNull();
  expect(
    screen.queryByRole("heading", { name: "Your match review" }),
  ).toBeNull();
  expect(screen.queryByText("AI reviews aren’t available yet.")).toBeNull();
  expect(fetcher.mock.calls.length).toBeGreaterThan(0);
  client.clear();
});
it("shows honest missing-key, sign-in and Steam states without a generate button", () => {
  const { rerender } = render(
    <MemoryRouter>
      <MatchReviewView
        signedIn
        steamConnected
        enabled={false}
        onGenerate={() => {}}
      />
    </MemoryRouter>,
  );
  expect(screen.queryByText("AI reviews aren’t available yet.")).toBeNull();
  expect(
    screen.queryByRole("heading", { name: "Your match review" }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Review this match" }),
  ).toBeNull();
  rerender(
    <MemoryRouter>
      <MatchReviewView
        signedIn={false}
        steamConnected={false}
        onGenerate={() => {}}
      />
    </MemoryRouter>,
  );
  expect(
    screen
      .getByRole("link", { name: "Sign in to review" })
      .getAttribute("href"),
  ).toBe("/signin");
  rerender(
    <MemoryRouter>
      <MatchReviewView signedIn steamConnected={false} onGenerate={() => {}} />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: "Connect Steam" }).getAttribute("href"),
  ).toBe("/account");
});
it("keeps saved reviews readable after AI is disabled", () => {
  render(
    <MemoryRouter>
      <MatchReviewView
        signedIn
        steamConnected
        enabled={false}
        review={saved}
        onGenerate={() => {}}
      />
    </MemoryRouter>,
  );
  expect(screen.getByText(saved.content.summary)).toBeDefined();
  expect(
    screen.queryByRole("button", { name: "Check for updates" }),
  ).toBeNull();
});

it("displays old saved AI timestamps as clocks without rewriting saved evidence", () => {
  const review = structuredClone(saved);
  review.content.summary =
    "Inspect the lead at 1600s and the finish at 3750 seconds.";
  review.content.improve[0].action = "Compare your options at 1600 segundos.";
  render(
    <MemoryRouter>
      <MatchReviewView
        signedIn
        steamConnected
        enabled={false}
        review={review}
        onGenerate={() => {}}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByText("Inspect the lead at 26:40 and the finish at 1:02:30."),
  ).toBeDefined();
  expect(screen.getByText("Compare your options at 26:40.")).toBeDefined();
  expect(review.content.summary).toContain("1600s");
  expect(review.context.facts).toEqual(saved.context.facts);
});
it("renders all three sections, evidence zero, coverage and empty concerns without invented claims", async () => {
  render(
    <MemoryRouter>
      <MatchReviewView
        signedIn
        steamConnected
        enabled
        review={saved}
        onGenerate={() => {}}
        error="Update failed"
      />
    </MemoryRouter>,
  );
  for (const title of ["What went well", "What went wrong", "How to improve"])
    expect(screen.getByRole("heading", { name: title })).toBeDefined();
  expect(
    screen.getByText(
      "No clear concern is supported by the available statistics.",
    ),
  ).toBeDefined();
  expect(screen.getByText("A match worth a closer look.")).toBeDefined();
  expect(screen.getByText("Update failed")).toBeDefined();
  await userEvent.click(
    screen.getByRole("button", { name: "Statistics used" }),
  );
  expect(screen.getAllByText("Deaths").length).toBeGreaterThan(0);
  expect(screen.getAllByText("0").length).toBeGreaterThan(0);
});
it("generates only on demand, preserves a saved review after update failure, and isolates identity changes", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  let generated = false;
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    if (init?.method === "POST") {
      if (generated)
        return Response.json({ error: "Update failed" }, { status: 502 });
      generated = true;
      return Response.json({ enabled: true, review: saved });
    }
    return Response.json({ enabled: true, review: null });
  });
  vi.stubGlobal("fetch", fetcher);
  const ui = (id: string) => (
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <MatchReview key={id} matchId="900" userId={id} steamId="verified" />
      </QueryClientProvider>
    </MemoryRouter>
  );
  const { rerender } = render(ui("one"));
  await screen.findByRole("button", { name: "Review this match" });
  expect(generated).toBe(false);
  await userEvent.click(
    screen.getByRole("button", { name: "Review this match" }),
  );
  await screen.findByText(saved.content.summary);
  await userEvent.click(
    screen.getByRole("button", { name: "Check for updates" }),
  );
  await screen.findByText("Update failed");
  expect(screen.getByText(saved.content.summary)).toBeDefined();
  rerender(ui("two"));
  await waitFor(() =>
    expect(screen.queryByText(saved.content.summary)).toBeNull(),
  );
  await screen.findByRole("button", { name: "Review this match" });
  await act(async () => client.clear());
});
it("does not let a stale in-flight read replace a newly generated review", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const key = [...getGetMatchReviewQueryKey("900"), "one", "verified"];
  client.setQueryData(
    key,
    { enabled: true, review: null },
    { updatedAt: Date.now() - 60000 },
  );
  let finish!: (value: Response) => void;
  const oldRead = new Promise<Response>((r) => (finish = r));
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) =>
    init?.method === "POST"
      ? Response.json({ enabled: true, review: saved })
      : oldRead,
  );
  vi.stubGlobal("fetch", fetcher);
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <MatchReview matchId="900" userId="one" steamId="verified" />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  await userEvent.click(
    screen.getByRole("button", { name: "Review this match" }),
  );
  await screen.findByText(saved.content.summary);
  await act(async () => {
    finish(Response.json({ enabled: true, review: null }));
    await oldRead;
  });
  await waitFor(() =>
    expect(client.getQueryState(key)?.fetchStatus).toBe("idle"),
  );
  expect(screen.getByText(saved.content.summary)).toBeDefined();
  client.clear();
});
