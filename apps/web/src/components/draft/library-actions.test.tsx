// @vitest-environment jsdom
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { DraftLibraryActions } from "./library-actions";
import { emptyDraft } from "../../lib/hero-draft";
import { setLocale } from "../../i18n";
const api = vi.hoisted(() => ({ pool: vi.fn(), save: vi.fn() }));
vi.mock("../../api/generated/tito", () => ({
  getSavedHeroPool: api.pool,
  saveDraftSnapshot: api.save,
  getGetSavedDraftsQueryKey: () => ["/api/library/drafts"],
}));
vi.mock("../../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: "owner", steamId: "42" } },
      isPending: false,
    }),
  },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  setLocale("en", false);
});
test("loads only explicit favorites and discards a response after the draft changes", async () => {
  let complete: (v: unknown) => void = () => {};
  api.pool.mockReturnValueOnce(new Promise((r) => (complete = r)));
  const onPool = vi.fn();
  const client = new QueryClient();
  const d = { ...emptyDraft(), role: "5" as const };
  const tree = (draft = d) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DraftLibraryActions draft={draft} onPool={onPool} />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(tree());
  expect(api.pool).not.toHaveBeenCalled();
  expect(api.save).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: "Load saved favorites" }),
  );
  view.rerender(tree({ ...d, pool: [1] }));
  await act(async () =>
    complete({ entries: [{ heroId: 5, preference: "favorite" }] }),
  );
  expect(onPool).not.toHaveBeenCalled();
  api.pool.mockResolvedValueOnce({
    entries: [
      { heroId: 5, preference: "comfortable" },
      { heroId: 2, preference: "avoid" },
      { heroId: 1, preference: "favorite" },
      { heroId: 3, preference: "learning" },
    ],
  });
  await userEvent.click(
    screen.getByRole("button", { name: "Load saved favorites" }),
  );
  expect(onPool).toHaveBeenCalledWith([1]);
  expect(screen.getByRole("status").textContent).toBe(
    "Saved favorites loaded. Other available heroes are still considered.",
  );
  act(() => setLocale("es", false));
  expect(screen.getByRole("status").textContent).toBe(
    "Favoritos guardados cargados. También se consideran los demás héroes disponibles.",
  );
  expect(
    screen.getByRole("button", { name: "Cargar favoritos guardados" }),
  ).toBeDefined();
  expect(api.save).not.toHaveBeenCalled();
  client.clear();
});
test("keeps current draft favorites when the saved role has no explicit favorites", async () => {
  api.pool.mockResolvedValueOnce({
    entries: [
      { heroId: 5, preference: "comfortable" },
      { heroId: 1, preference: "learning" },
      { heroId: 2, preference: "avoid" },
    ],
  });
  const onPool = vi.fn();
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DraftLibraryActions
          draft={{ ...emptyDraft(), role: "5", pool: [1] }}
          onPool={onPool}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Load saved favorites" }),
  );
  expect(onPool).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toBe(
    "No favorites are saved for this role. Mark heroes as Favorite in your hero pools.",
  );
  client.clear();
});
