// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { JournalPage } from "./journal";
import { DraftHistoryPage } from "./draft-history";
import { getGetSavedHistoryQueryKey } from "../api/generated/tito";
const state = vi.hoisted(() => ({
  userId: "one",
  steamId: "76561197960265770" as string | null,
}));
vi.mock("../lib/auth", () => ({
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
function mount(element: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  const tree = (content: React.ReactNode) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{content}</MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(tree(element));
  return {
    ...view,
    replace: (content: React.ReactNode) => view.rerender(tree(content)),
  };
}
const notes = [
  {
    matchId: "900",
    text: "Review opening ward",
    tags: ["vision"],
    actualRole: "5",
    bookmarkSeconds: 0,
    updatedAt: "2026-11-07T00:00:00Z",
  },
  {
    matchId: "901",
    text: "Protect the wave",
    tags: ["laning"],
    actualRole: null,
    bookmarkSeconds: null,
    updatedAt: "2026-11-07T01:00:00Z",
  },
];
const draft = {
  id: "00000000-0000-4000-8000-000000000001",
  input: {
    role: "5",
    allies: [1],
    enemies: [2],
    bans: [3],
    pool: [5, 20],
    useHistory: false,
  },
  chosenHeroId: 5,
  matchId: null,
  createdAt: "2026-11-07T00:00:00Z",
  updatedAt: "2026-11-07T00:00:00Z",
};
const heroes = [
  { id: 1, name: "Anti-Mage" },
  { id: 2, name: "Axe" },
  { id: 3, name: "Bane" },
  { id: 5, name: "Crystal Maiden" },
  { id: 20, name: "Vengeful Spirit" },
].map((hero) => ({
  ...hero,
  image: null,
  roles: [],
  attackType: null,
  attribute: null,
}));
it("filters bookmarked zero seconds correctly and deletes only after an explicit action", async () => {
  const user = userEvent.setup(),
    deletions: string[] = [];
  let saved = [...notes];
  vi.stubGlobal("fetch", async (value: unknown, init?: RequestInit) => {
    const url = String(value);
    if (init?.method === "DELETE") {
      deletions.push(url);
      saved = saved.filter((n) => !url.endsWith(n.matchId));
      return Response.json({ deleted: true });
    }
    return Response.json({ notes: saved });
  });
  mount(<JournalPage />);
  const historyKeys = [100, 1000].map((limit) => [
    ...getGetSavedHistoryQueryKey({ limit }),
    state.userId,
    state.steamId,
  ]);
  const otherHistory = [
    ...getGetSavedHistoryQueryKey({ limit: 1000 }),
    "other",
    "76561197960265827",
  ];
  for (const key of [...historyKeys, otherHistory])
    clients[0].setQueryData(key, { matches: [] });
  await screen.findByText("Review opening ward");
  expect(deletions).toEqual([]);
  await user.click(screen.getByLabelText("Only bookmarked moments"));
  expect(screen.queryByText("Protect the wave")).toBeNull();
  expect(screen.getByText("Review opening ward")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Delete note 900" }));
  await waitFor(() =>
    expect(screen.queryByText("Review opening ward")).toBeNull(),
  );
  expect(deletions).toEqual(["/api/library/notes/900"]);
  for (const key of historyKeys)
    expect(clients[0].getQueryState(key)?.isInvalidated).toBe(true);
  expect(clients[0].getQueryState(otherHistory)?.isInvalidated).toBe(false);
});
it("shows only current-identity journal contents when switching accounts", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ notes: state.userId === "one" ? notes : [] }),
  );
  const view = mount(<JournalPage />);
  await screen.findByText("Review opening ward");
  state.userId = "two";
  view.replace(<JournalPage />);
  expect(screen.queryByText("Review opening ward")).toBeNull();
  await screen.findByText("No saved notes or bookmarks yet.");
});
it("edits an available chosen hero and links only a saved match without triggering AI", async () => {
  const user = userEvent.setup(),
    writes: Array<{ url: string; body: unknown }> = [];
  let saved = { ...draft };
  vi.stubGlobal("fetch", async (value: unknown, init?: RequestInit) => {
    const url = String(value);
    if (init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      writes.push({ url, body });
      saved = { ...saved, ...body, updatedAt: "2026-11-07T01:00:00Z" };
      return Response.json(saved);
    }
    if (url === "/api/library/drafts")
      return Response.json({ drafts: [saved] });
    if (url.startsWith("/api/draft/heroes"))
      return Response.json({
        heroes,
        retrievedAt: "2026-11-07",
        source: "bundled",
        enabled: false,
      });
    if (url.startsWith("/api/history"))
      return Response.json({
        matches: [{ id: "900", hero: "Crystal Maiden", startedAt: 1794009600 }],
      });
    return Response.json({
      heroes,
      retrievedAt: "2026-11-07",
      source: "bundled",
      enabled: false,
    });
  });
  mount(<DraftHistoryPage />);
  const choice = await screen.findByLabelText("Chosen hero");
  await user.click(choice);
  await screen.findByRole("option", { name: "Vengeful Spirit" });
  expect(screen.queryByRole("option", { name: "Anti-Mage" })).toBeNull();
  await user.click(screen.getByRole("option", { name: "Vengeful Spirit" }));
  await user.click(screen.getByRole("combobox", { name: "Link your match" }));
  await user.click(
    await screen.findByRole("option", { name: /Crystal Maiden.*#900/ }),
  );
  expect(writes).toEqual([]);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(writes).toEqual([
      {
        url: `/api/library/drafts/${draft.id}`,
        body: { chosenHeroId: 20, matchId: "900" },
      },
    ]),
  );
});

it("keeps draft edits after a failed update and deletes a snapshot only on request", async () => {
  const user = userEvent.setup(),
    actions: string[] = [];
  let retained = true;
  vi.stubGlobal("fetch", async (value: unknown, init?: RequestInit) => {
    const url = String(value);
    if (init?.method === "PATCH") {
      actions.push("patch");
      return Response.json(
        { error: "This match is no longer retained." },
        { status: 404 },
      );
    }
    if (init?.method === "DELETE") {
      actions.push("delete");
      retained = false;
      return Response.json({ deleted: true });
    }
    if (url === "/api/library/drafts")
      return Response.json({ drafts: retained ? [draft] : [] });
    if (url.startsWith("/api/history")) return Response.json({ matches: [] });
    return Response.json({
      heroes,
      retrievedAt: "2026-11-07",
      source: "bundled",
      enabled: false,
    });
  });
  mount(<DraftHistoryPage />);
  const choice = await screen.findByLabelText("Chosen hero");
  await user.click(choice);
  await user.click(
    await screen.findByRole("option", { name: "Vengeful Spirit" }),
  );
  expect(actions).toEqual([]);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await screen.findByText("This match is no longer retained.");
  expect(
    screen.getByRole("combobox", { name: "Chosen hero" }).textContent,
  ).toContain("Vengeful Spirit");
  await user.click(
    screen.getByRole("button", { name: `Delete draft ${draft.id}` }),
  );
  await screen.findByText(
    "No saved drafts yet. Save a snapshot from the hero picker.",
  );
  expect(actions).toEqual(["patch", "delete"]);
});
