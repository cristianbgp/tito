// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SavedHistoryControls } from "./saved-history-controls";
import { setLocale } from "../../i18n";
import type { SavedHistory } from "../../api/generated/models";
const scope = ["saved-history", "owner", "42"] as const;
const history: SavedHistory = {
  accountId: "42",
  matches: [],
  total: 0,
  lastSyncedAt: "2026-11-07T00:00:00Z",
  nextSyncAt: null,
  hasOlder: true,
  retentionLimit: 1000,
  importSize: 100,
};
let client: QueryClient;
beforeEach(() => {
  vi.useFakeTimers();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setLocale("en", false);
});
function mount() {
  return render(
    <QueryClientProvider client={client}>
      <SavedHistoryControls
        history={history}
        scope={scope}
        loading={false}
        onShowMore={() => {}}
      />
    </QueryClientProvider>,
  );
}
it("explains a delayed provider in the active language and clears the message after completion", async () => {
  let finish!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => pending),
  );
  mount();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Sync new matches" }));
  });
  expect(screen.queryByRole("status")).toBeNull();
  await act(() => vi.advanceTimersByTimeAsync(4000));
  expect(screen.getByRole("status").textContent).toContain(
    "OpenDota is taking longer",
  );
  act(() => setLocale("es", false));
  expect(screen.getByRole("status").textContent).toContain(
    "OpenDota está tardando",
  );
  await act(async () => {
    finish(Response.json(history));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.queryByRole("status")).toBeNull();
  expect(client.getQueryData([...scope, 100])).toMatchObject({
    accountId: "42",
  });
});
it("does not restore a late private sync result after its owner leaves the screen and cache clears", async () => {
  let finish!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => pending),
  );
  const view = mount();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Sync new matches" }));
  });
  view.unmount();
  client.clear();
  await act(async () => {
    finish(Response.json(history));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(client.getQueryData([...scope, 100])).toBeUndefined();
});

it("prevents a history read started before sync from overwriting the completed sync", async () => {
  const key = [...scope, 100];
  client.setQueryData(key, history);
  let finishRead!: (data: SavedHistory) => void;
  const read = new Promise<SavedHistory>((resolve) => {
    finishRead = resolve;
  });
  const background = client
    .fetchQuery({ queryKey: key, queryFn: () => read })
    .catch(() => undefined);
  let finishSync!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    finishSync = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => pending),
  );
  mount();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Sync new matches" }));
  });
  const fresh = { ...history, lastSyncedAt: "2026-11-08T00:00:00Z" };
  await act(async () => {
    finishSync(Response.json(fresh));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(client.getQueryData(key)).toMatchObject({
    lastSyncedAt: fresh.lastSyncedAt,
  });
  await act(async () => {
    finishRead(history);
    await background;
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(client.getQueryData(key)).toMatchObject({
    lastSyncedAt: fresh.lastSyncedAt,
  });
});
