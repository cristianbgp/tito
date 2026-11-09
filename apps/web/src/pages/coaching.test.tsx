// @vitest-environment jsdom
import { cleanup, render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { CoachingPage } from "./coaching";
import { MatchFollowUp } from "../components/coaching/match-follow-up";
const identity = vi.hoisted(() => ({
  userId: "owner",
  steamId: "76561197960265770" as string | null,
  signedIn: true,
}));
vi.mock("../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: identity.signedIn
        ? { user: { id: identity.userId, steamId: identity.steamId } }
        : null,
      isPending: false,
    }),
  },
}));
const evidence = [
  {
    id: "hero.1.deaths.recent",
    metric: "deaths",
    value: 0,
    samples: 5,
    matchIds: ["100"],
  },
];
const fixture = {
  enabled: false,
  summary: null,
  insights: {
    asOf: "2026-11-07T00:00:00Z",
    verified: true,
    retainedMatches: 10,
    minimumSamples: 5,
    timeZone: "UTC",
    strengths: [
      {
        text: "Deaths averaged zero in the recent sample.",
        evidenceIds: [evidence[0]!.id],
      },
    ],
    concerns: [],
    evidence,
    latestDay: {
      date: "2026-11-07",
      games: 2,
      wins: 1,
      losses: 1,
      unknown: 0,
      reflection: "Review one decision from the latest saved day.",
    },
    limitations: ["Role and causes are unknown."],
  },
};
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach((c) => c.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
  identity.userId = "owner";
  identity.steamId = "76561197960265770";
  identity.signedIn = true;
});
function mount(child = <CoachingPage />) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  clients.push(client);
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter>{child}</MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}
test("shows own deterministic evidence without AI, and isolates account changes", async () => {
  const fetcher = vi.fn(async () =>
    Response.json(
      identity.userId === "owner"
        ? fixture
        : {
            ...fixture,
            insights: {
              ...fixture.insights,
              strengths: [],
              evidence: [],
              retainedMatches: 0,
              latestDay: null,
            },
          },
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  const view = mount();
  await screen.findByText("Deaths averaged zero in the recent sample.");
  expect(screen.getByText(/AI coaching is not configured/)).toBeDefined();
  expect(
    (
      screen.getByRole("button", {
        name: "Generate AI reflection",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(
    screen.getAllByRole("link", { name: "Match 100" })[0]?.getAttribute("href"),
  ).toBe("/matches/100");
  identity.userId = "other";
  view.rerender(
    <QueryClientProvider client={view.client}>
      <MemoryRouter>
        <CoachingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText("Import your saved matches to start.");
  expect(
    screen.queryByText("Deaths averaged zero in the recent sample."),
  ).toBeNull();
});
test("does not request private coaching when signed out or unlinked", () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  identity.signedIn = false;
  const view = mount();
  expect(screen.getByRole("link", { name: "Sign in" })).toBeDefined();
  expect(fetcher).not.toHaveBeenCalled();
  view.unmount();
  identity.signedIn = true;
  identity.steamId = null;
  mount();
  expect(screen.getByRole("link", { name: "Connect Steam" })).toBeDefined();
  expect(fetcher).not.toHaveBeenCalled();
});
test("follow-up sends a selected bounded question only on submit and preserves answer on error", async () => {
  const user = userEvent.setup();
  let posts = 0;
  const answer = {
    fingerprint: "x",
    kind: "follow_up",
    matchId: "100",
    generatedAt: "2026-11-07T00:00:00Z",
    model: "mini",
    promptVersion: "v1",
    question: "What should I focus on next?",
    content: {
      text: "Causes need replay verification.",
      evidenceIds: [evidence[0]!.id],
      needsReplay: true,
    },
    evidence,
  };
  const state = {
    enabled: true,
    answer: null,
    questions: [
      { id: "focus", label: "What should I focus on next?" },
      { id: "replay", label: "What should I check in the replay?" },
    ],
    privacyNotice: "Do not include private information.",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      if (init?.method === "POST") {
        posts++;
        return posts === 1
          ? Response.json({ ...state, answer })
          : Response.json({ error: "Budget reached" }, { status: 429 });
      }
      return Response.json(state);
    }),
  );
  mount(<MatchFollowUp matchId="100" />);
  await screen.findByRole("button", { name: "What should I focus on next?" });
  expect(posts).toBe(0);
  await user.click(
    screen.getByRole("button", { name: "What should I focus on next?" }),
  );
  await screen.findByText("Causes need replay verification.");
  await user.click(
    screen.getByRole("button", { name: "What should I check in the replay?" }),
  );
  await screen.findByText("Budget reached");
  expect(screen.getByText("Causes need replay verification.")).toBeDefined();
});
test("keeps a loaded deterministic response after refresh failure", async () => {
  let fail = false;
  vi.stubGlobal("fetch", async () =>
    fail
      ? Response.json({ error: "Unavailable" }, { status: 503 })
      : Response.json(fixture),
  );
  const view = mount();
  await screen.findByText("Deaths averaged zero in the recent sample.");
  fail = true;
  await act(() => view.client.invalidateQueries());
  await screen.findByText("Unavailable");
  expect(
    screen.getByText("Deaths averaged zero in the recent sample."),
  ).toBeDefined();
});
test("omits empty disabled match follow-up while keeping earlier saved answers readable", async () => {
  const answer = {
    fingerprint: "saved",
    kind: "follow_up",
    matchId: "100",
    generatedAt: "2026-11-07T00:00:00Z",
    model: "mini",
    promptVersion: "v1",
    question: "What should I check in the replay?",
    content: {
      text: "Earlier saved replay advice.",
      evidenceIds: [],
      needsReplay: true,
    },
    evidence: [],
  };
  let saved = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        enabled: false,
        answer: saved ? answer : null,
        questions: [],
        privacyNotice: "",
      }),
    ),
  );
  const view = mount(<MatchFollowUp matchId="100" />);
  await act(async () => {
    await view.client.invalidateQueries();
  });
  expect(
    screen.queryByRole("heading", { name: "Ask about this review" }),
  ).toBeNull();
  saved = true;
  await act(async () => {
    await view.client.invalidateQueries();
  });
  await screen.findByText("Earlier saved replay advice.");
});
