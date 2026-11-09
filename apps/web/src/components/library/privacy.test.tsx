// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { HeroLibraryPage } from "../../pages/hero-library";
import { MatchNotebook } from "./match-notebook";
import { ReviewFeedback } from "./review-feedback";
import { getGetSavedHistoryQueryKey } from "../../api/generated/tito";
const state = vi.hoisted(() => ({
  userId: "one",
  steamId: "76561197960265770" as string | null,
}));
vi.mock("../../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: state.userId, steamId: state.steamId } },
      isPending: false,
    }),
  },
}));
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach((c) => c.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
  state.userId = "one";
  state.steamId = "76561197960265770";
});
const mount = (children: React.ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  const tree = (content: React.ReactNode) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{content}</MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(tree(children));
  return {
    ...view,
    replace: (content: React.ReactNode) => view.rerender(tree(content)),
  };
};
const hero = {
  hero: {
    id: 5,
    name: "Private Crystal Maiden",
    image: null,
    roles: ["Support"],
    attackType: "Ranged",
    attribute: "int",
  },
  games: 4,
  knownResults: 3,
  wins: 2,
  winRate: 2 / 3,
  kills: 0,
  deaths: 0,
  assists: null,
  goldPerMinute: null,
  experiencePerMinute: null,
  reviewedGames: 1,
  notedGames: 2,
};
it("removes private hero content immediately when the linked account changes", async () => {
  const requests: string[] = [];
  vi.stubGlobal("fetch", async (value: unknown) => {
    requests.push(String(value));
    return Response.json({
      heroes: state.steamId === "76561197960265770" ? [hero] : [],
    });
  });
  const view = mount(<HeroLibraryPage />);
  await screen.findByRole("heading", { name: "Private Crystal Maiden" });
  state.steamId = "76561197960265827";
  view.replace(<HeroLibraryPage />);
  expect(
    screen.queryByRole("heading", { name: "Private Crystal Maiden" }),
  ).toBeNull();
  await screen.findAllByText("Your hero library is waiting");
  expect(requests).toHaveLength(2);
  state.steamId = null;
  view.replace(<HeroLibraryPage />);
  expect(
    screen.queryByRole("heading", { name: "Private Crystal Maiden" }),
  ).toBeNull();
  expect(requests).toHaveLength(2);
});
it("retains the edited notebook if a save fails and sends no owner or account identity", async () => {
  const user = userEvent.setup(),
    writes: unknown[] = [];
  vi.stubGlobal("fetch", async (value: unknown, options?: RequestInit) => {
    if (options?.method === "PUT") {
      writes.push(JSON.parse(String(options.body)));
      return Response.json(
        { error: "Your saved annotations are full." },
        { status: 409 },
      );
    }
    return Response.json({ note: null });
  });
  mount(<MatchNotebook matchId="900" />);
  const input = await screen.findByLabelText("Private note");
  await user.type(input, "Keep this observation");
  await user.click(screen.getByRole("button", { name: "Save note" }));
  await screen.findByText("Your saved annotations are full.");
  expect(
    (screen.getByLabelText("Private note") as HTMLTextAreaElement).value,
  ).toBe("Keep this observation");
  expect(writes).toEqual([
    {
      text: "Keep this observation",
      tags: [],
      actualRole: null,
      bookmarkSeconds: null,
    },
  ]);
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Save note" })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
});

it("invalidates only the current owner history variants when confirming or deleting a note role", async () => {
  const user = userEvent.setup();
  let note: unknown = null;
  vi.stubGlobal("fetch", async (_value: unknown, options?: RequestInit) => {
    if (options?.method === "PUT") {
      note = {
        ...JSON.parse(String(options.body)),
        matchId: "900",
        updatedAt: "2026-11-07T01:00:00Z",
      };
      return Response.json(note);
    }
    if (options?.method === "DELETE") {
      note = null;
      return Response.json({ deleted: true });
    }
    return Response.json({ note });
  });
  mount(<MatchNotebook matchId="900" />);
  const keys = [100, 1000].map((limit) => [
    ...getGetSavedHistoryQueryKey({ limit }),
    state.userId,
    state.steamId,
  ]);
  const other = [
    ...getGetSavedHistoryQueryKey({ limit: 1000 }),
    "other",
    "76561197960265827",
  ];
  for (const key of [...keys, other])
    clients[0].setQueryData(key, { matches: [] });
  await screen.findByLabelText("Private note");
  await user.click(
    screen.getByRole("combobox", { name: "Role I played (confirmed by me)" }),
  );
  await user.click(
    await screen.findByRole("option", { name: "Position 5 · Hard support" }),
  );
  await user.click(screen.getByRole("button", { name: "Save note" }));
  await screen.findByText("Note saved.");
  for (const key of keys)
    expect(clients[0].getQueryState(key)?.isInvalidated).toBe(true);
  expect(clients[0].getQueryState(other)?.isInvalidated).toBe(false);
  for (const key of keys) clients[0].setQueryData(key, { matches: [] });
  await user.click(screen.getByRole("button", { name: "Delete note" }));
  await screen.findByText("Note deleted.");
  for (const key of keys)
    expect(clients[0].getQueryState(key)?.isInvalidated).toBe(true);
  expect(clients[0].getQueryState(other)?.isInvalidated).toBe(false);
});

it("clears saved review feedback only on the explicit clear action", async () => {
  const user = userEvent.setup(),
    deletions: string[] = [];
  vi.stubGlobal("fetch", async (value: unknown, options?: RequestInit) => {
    if (options?.method === "DELETE") {
      deletions.push(String(value));
      return Response.json({ deleted: true });
    }
    return Response.json({
      feedback: {
        rating: "incorrect",
        comment: "Saved review comment",
        updatedAt: "2026-11-07T00:00:00Z",
      },
    });
  });
  mount(<ReviewFeedback matchId="900" generatedAt="2026-11-07T00:00:00Z" />);
  await screen.findByDisplayValue("Saved review comment");
  expect(deletions).toEqual([]);
  await user.click(screen.getByRole("button", { name: "Clear feedback" }));
  await screen.findByText("Feedback cleared.");
  expect(screen.queryByDisplayValue("Saved review comment")).toBeNull();
  expect(screen.queryByRole("button", { name: "Clear feedback" })).toBeNull();
  expect(deletions).toEqual(["/api/library/feedback/900"]);
  expect(
    (screen.getByRole("button", { name: "Save feedback" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
