// @vitest-environment jsdom
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { setLocale } from "../../i18n";
import { ReplayImportControl } from "./replay-import";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setLocale("en", false);
});
it("uploads sequential chunks and opens the imported match, with translated labels", async () => {
  const offsets: number[] = [];
  const state = {
    id: "job",
    status: "uploading",
    uploadedBytes: 0,
    totalBytes: 32,
    expiresAt: "2099-01-01T00:00:00Z",
    matchId: null,
    error: null,
  };
  vi.stubGlobal("fetch", async (input: string, options?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.endsWith("/capabilities"))
      return Response.json({
        enabled: true,
        maxBytes: 1000,
        chunkBytes: 16,
        retentionLimit: 50,
        dailyLimit: 5,
        activeImport: null,
      });
    if (options?.method === "PUT") {
      offsets.push(Number(url.searchParams.get("offset")));
      return Response.json({ ...state, uploadedBytes: offsets.at(-1)! + 16 });
    }
    if (url.pathname.endsWith("/complete"))
      return Response.json({
        ...state,
        status: "processing",
        uploadedBytes: 32,
      });
    if (options?.method === "POST") return Response.json(state);
    return Response.json({
      ...state,
      status: "complete",
      uploadedBytes: 32,
      matchId: "900",
    });
  });
  setLocale("es", false);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ReplayImportControl
          scope={["saved-history", "owner", "42"]}
          accountId="42"
        />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  const input = await screen.findByLabelText("Archivo de repetición (.dem)");
  fireEvent.change(input, {
    target: { files: [new File([new Uint8Array(32)], "lobby.dem")] },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Importar esta repetición" }),
  );
  const link = await screen.findByRole("link", {
    name: "Abrir partida importada",
  });
  expect(link.getAttribute("href")).toBe("/matches/900?player=42");
  expect(offsets).toEqual([0, 16]);
  cleanup();
  client.clear();
});

it("explains unavailable parsing without offering a broken upload action", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({
      enabled: false,
      maxBytes: 1000,
      chunkBytes: 16,
      retentionLimit: 50,
      dailyLimit: 5,
      activeImport: null,
    }),
  );
  const client = new QueryClient();
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ReplayImportControl scope={["owner"]} accountId="42" />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(
      screen.getByText("Replay import is not available on this server yet."),
    ).toBeTruthy(),
  );
  expect(
    screen.queryByRole("button", { name: "Import this replay" }),
  ).toBeNull();
  cleanup();
  client.clear();
});

it("follows an upload already started in another tab through completion", async () => {
  const state = {
    id: "existing-job",
    status: "uploading",
    uploadedBytes: 16,
    totalBytes: 32,
    expiresAt: "2099-01-01T00:00:00Z",
    matchId: null,
    error: null,
  };
  vi.stubGlobal("fetch", async (input: string) =>
    String(input).endsWith("/capabilities")
      ? Response.json({
          enabled: true,
          maxBytes: 1000,
          chunkBytes: 16,
          retentionLimit: 50,
          dailyLimit: 5,
          activeImport: state,
        })
      : Response.json({ ...state, status: "complete", matchId: "900" }),
  );
  const client = new QueryClient();
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ReplayImportControl scope={["owner"]} accountId="42" />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("link", { name: "Open imported match" }),
  ).toBeTruthy();
  cleanup();
  client.clear();
});
