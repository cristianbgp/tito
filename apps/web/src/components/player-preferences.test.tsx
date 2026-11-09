// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { PlayerPreferences } from "./player-preferences";
import { getGetPlayerProfileQueryKey } from "../api/generated/tito";
import type { PlayerProfile } from "../api/generated/models";

const initialProfile: PlayerProfile = {
  accountId: "70388657",
  linkedAccountId: "70388657",
  role: 4,
  experience: "beginner",
};
function ProfileHarness() {
  const { data } = useQuery<PlayerProfile>({
    queryKey: [...getGetPlayerProfileQueryKey(), "test-player"],
    queryFn: async () => initialProfile,
    initialData: initialProfile,
    enabled: false,
  });
  return <PlayerPreferences userId="test-player" profile={data} />;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("opens labeled options, restores focus, and saves typed preferences including choose-later", async () => {
  const user = userEvent.setup();
  const requests: unknown[] = [];
  vi.stubGlobal("fetch", async (_url: unknown, init: RequestInit) => {
    const data = JSON.parse(String(init.body));
    requests.push(data);
    return Response.json({ ...data, linkedAccountId: "70388657" });
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProfileHarness />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const role = screen.getByRole("combobox", { name: "Preferred role" });
  await user.click(role);
  expect(
    await screen.findByRole("listbox", {}, { timeout: 1000 }),
  ).toBeDefined();
  await user.keyboard("{Escape}");
  expect(document.activeElement).toBe(role);
  await user.click(role);
  await user.click(
    await screen.findByRole("option", { name: "5 · Hard support" }),
  );
  const experience = screen.getByRole("combobox", { name: "Experience level" });
  await user.click(experience);
  await user.click(await screen.findByRole("option", { name: "Choose later" }));
  await user.click(screen.getByRole("button", { name: "Save preferences" }));
  await screen.findByRole("status");
  expect(requests).toEqual([
    { accountId: "70388657", role: 5, experience: null },
  ]);
  await user.click(role);
  await user.click(await screen.findByRole("option", { name: "Choose later" }));
  await user.click(screen.getByRole("button", { name: "Save preferences" }));
  await waitFor(() => expect(requests).toHaveLength(2));
  expect(requests[1]).toEqual({
    accountId: "70388657",
    role: null,
    experience: null,
  });
  client.clear();
});
