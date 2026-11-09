// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { MatchPage } from "./match";

vi.mock("../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: "viewer", steamId: null } },
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
function setup(status: "complete" | "unavailable") {
  let parsed = false;
  const detail = () => ({
    id: "123",
    startedAt: 1700000000,
    duration: 1800,
    winner: "radiant",
    parsed,
    gameMode: 22,
    lobbyType: 7,
    region: null,
    radiantScore: 30,
    direScore: 20,
    metadataAvailable: true,
    players: [],
    goldAdvantage: parsed ? [{ time: 0, value: 0 }] : [],
    experienceAdvantage:
      parsed && status === "complete" ? [{ time: 0, value: 0 }] : [],
  });
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    if (input.endsWith("/review"))
      return Response.json({ enabled: false, review: null });
    if (input === "/api/profile")
      return Response.json({ accountId: null, linkedAccountId: null });
    if (input === "/api/matches/123/parse" && init?.method === "POST")
      return Response.json({ jobId: "456" });
    if (input === "/api/matches/123/parse/456") {
      parsed = true;
      return Response.json({ status, match: detail() });
    }
    if (input === "/api/matches/123") return Response.json(detail());
    throw new Error(`Unexpected fixture request: ${input}`);
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/matches/123"]}>
        <Routes>
          <Route path="/matches/:matchId" element={<MatchPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
test.each(["complete", "unavailable"] as const)(
  "refreshes match statistics after a %s parse result without a separate evidence panel",
  async (status) => {
    setup(status);
    await screen.findByRole("button", { name: "Request replay analysis" });
    expect(
      screen.queryByRole("heading", { name: "Replay evidence" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Load replay evidence" }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Request replay analysis" }),
    );
    await screen.findByText("Replay data available");
    if (status === "complete") {
      await screen.findByRole("heading", { name: "Gold advantage" });
      await screen.findByRole("heading", { name: "XP advantage" });
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: "Request replay analysis" }),
        ).toBeNull(),
      );
    } else {
      await screen.findByText(
        /OpenDota could not provide all requested replay data/,
      );
      expect(
        screen.getByRole("button", { name: "Request replay analysis" }),
      ).toBeTruthy();
    }
  },
);
