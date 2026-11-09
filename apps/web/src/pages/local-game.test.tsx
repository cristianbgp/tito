// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { LocalGamePage } from "./local-game";
import {
  LocalDraftImport,
  importableLocalState,
} from "../components/draft/local-import";
const identity = vi.hoisted(() => ({ id: "owner", signedIn: true }));
vi.mock("../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: identity.signedIn
        ? { user: { id: identity.id, steamId: null } }
        : null,
      isPending: false,
    }),
  },
}));
const fresh = () => ({
  supported: true,
  configured: true,
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  receivedAt: new Date().toISOString(),
  stale: false,
  matchId: "100",
  team: "radiant",
  ownHeroId: 1,
  allies: [2, 3],
  enemies: [4, 5],
  bans: [6],
  partial: true,
});
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach((c) => c.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
  identity.id = "owner";
  identity.signedIn = true;
  vi.restoreAllMocks();
});
function mount(child = <LocalGamePage />) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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
test("hosted setup is honestly unavailable and requires sign-in", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({ ...fresh(), supported: false }),
  );
  vi.stubGlobal("fetch", fetcher);
  const view = mount();
  await screen.findByText(/Hosted Tito does not accept/);
  expect(
    screen.queryByRole("button", { name: "Create game configuration" }),
  ).toBeNull();
  view.unmount();
  identity.signedIn = false;
  mount();
  expect(screen.getByRole("link", { name: "Sign in" })).toBeDefined();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test("setup is explicit, token stays out of query/mutation caches and disappears on account switch", async () => {
  let configured = false;
  const fetcher = vi.fn(async (_url, init) => {
    if (init?.method === "POST") {
      configured = true;
      return Response.json({
        filename: "gamestate_integration_tito.cfg",
        expiresAt: new Date(Date.now() + 4 * 3600000).toISOString(),
        receiverUrl: "http://127.0.0.1:3001/api/local/gsi",
        launchOption: "-gamestateintegration",
        configuration: '"auth" { "token" "supersecret" }',
      });
    }
    return Response.json({
      ...fresh(),
      configured: identity.id === "owner" && configured,
    });
  });
  vi.stubGlobal("fetch", fetcher);
  const user = userEvent.setup(),
    view = mount();
  const createUrl = vi.fn(() => "blob:local-configuration"),
    revokeUrl = vi.fn();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revokeUrl;
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  await screen.findByRole("button", { name: "Create game configuration" });
  expect(configured).toBe(false);
  await user.click(
    screen.getByRole("button", { name: "Create game configuration" }),
  );
  await screen.findByRole("button", { name: "Download configuration" });
  expect(screen.getByText("-gamestateintegration")).toBeDefined();
  expect(screen.queryByText(/No game payload has arrived yet/)).toBeNull();
  expect(screen.getByText(/four hours or an API restart/)).toBeDefined();
  expect(
    JSON.stringify(
      view.client
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    ),
  ).not.toContain("supersecret");
  expect(view.client.getMutationCache().getAll()).toHaveLength(0);
  expect(createUrl).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Download configuration" }),
  );
  expect(createUrl).toHaveBeenCalledTimes(1);
  expect(revokeUrl).toHaveBeenCalledWith("blob:local-configuration");
  identity.id = "other";
  view.rerender(
    <QueryClientProvider client={view.client}>
      <MemoryRouter>
        <LocalGamePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByRole("button", { name: "Create game configuration" });
  expect(screen.queryByText(/supersecret/)).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Download configuration" }),
  ).toBeNull();
});
test("picker import rechecks fresh payload and never runs setup or AI", async () => {
  const user = userEvent.setup(),
    onImport = vi.fn(),
    fetcher = vi.fn(async () => Response.json(fresh()));
  vi.stubGlobal("fetch", fetcher);
  mount(<LocalDraftImport onImport={onImport} />);
  await screen.findByRole("button", { name: "Use revealed picks" });
  expect(onImport).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Use revealed picks" }));
  await vi.waitFor(() =>
    expect(onImport).toHaveBeenCalledWith({
      allies: [2, 3],
      enemies: [4, 5],
      bans: [6],
    }),
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
});
test("picker rejects stale, unknown-team, conflicting and five-allies payloads", async () => {
  const user = userEvent.setup(),
    onImport = vi.fn();
  let state = fresh();
  vi.stubGlobal("fetch", async () => Response.json(state));
  mount(<LocalDraftImport onImport={onImport} />);
  await screen.findByRole("button", { name: "Use revealed picks" });
  for (const patch of [
    { stale: true },
    { team: null },
    { allies: [1, 2, 3, 7, 8] },
    { enemies: [2, 5] },
  ]) {
    state = { ...fresh(), ...patch } as ReturnType<typeof fresh>;
    await user.click(
      screen.getByRole("button", { name: "Use revealed picks" }),
    );
    await screen.findByText(/fresh team-specific payload is required/);
  }
  expect(onImport).not.toHaveBeenCalled();
});
test("freshness and expiry are revalidated locally even when the snapshot flag is wrong", () => {
  const state = fresh(),
    now = Date.now();
  expect(
    importableLocalState(
      { ...state, receivedAt: new Date(now - 15001).toISOString() },
      now,
    ),
  ).toBe(false);
  expect(
    importableLocalState(
      { ...state, expiresAt: new Date(now - 1).toISOString() },
      now,
    ),
  ).toBe(false);
  expect(importableLocalState({ ...state, allies: [2, 2] }, now)).toBe(false);
  expect(
    importableLocalState({ ...state, allies: [], enemies: [], bans: [] }, now),
  ).toBe(false);
});
