// @vitest-environment jsdom
import {
  act,
  cleanup,
  render as renderUI,
  screen,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { HeroPickerTool } from "./hero-picker";
import { setLocale } from "../../i18n";
const queuedImport = vi.hoisted(() => ({
  run: null as
    | null
    | ((state: {
        allies: number[];
        enemies: number[];
        bans: number[];
      }) => void),
}));
vi.mock("./local-import", () => ({
  LocalDraftImport: ({
    onImport,
  }: {
    onImport: NonNullable<typeof queuedImport.run>;
  }) => (
    <button onClick={() => (queuedImport.run = onImport)}>
      Capture local import
    </button>
  ),
}));
vi.mock("../../lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: "test", steamId: null } },
      isPending: false,
    }),
  },
}));
const clients: QueryClient[] = [];
function render(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  return renderUI(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>,
  );
}
import type {
  DraftHero,
  HeroDraftInput,
  HeroDraftResult,
} from "../../api/generated/models";
const heroes: DraftHero[] = [
  {
    id: 1,
    name: "Anti-Mage",
    image: null,
    roles: ["Carry"],
    attackType: "Melee",
    attribute: "agi",
  },
  {
    id: 2,
    name: "Axe",
    image: null,
    roles: ["Initiator"],
    attackType: "Melee",
    attribute: "str",
  },
  {
    id: 5,
    name: "Crystal Maiden",
    image: null,
    roles: ["Support"],
    attackType: "Ranged",
    attribute: "int",
  },
];
const result = (input: HeroDraftInput): HeroDraftResult => ({
  fingerprint: "test",
  generatedAt: "2026-11-07T20:00:00Z",
  expiresAt: "2030-01-01T00:00:00Z",
  model: "gpt-6-luna",
  promptVersion: "test",
  input,
  historyGames: 0,
  personalized: false,
  evaluatedHeroes: 1,
  recommendations: [
    {
      hero: heroes[2],
      fit: 3,
      confidence: 0.8,
      reason: "role_fit",
      tradeoff: "limited_information",
      savedGames: 0,
    },
  ],
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  for (const client of clients) client.clear();
  clients.length = 0;
  setLocale("en", false);
});
async function requestSuggestions(
  onSuggest: (input: HeroDraftInput) => Promise<HeroDraftResult>,
) {
  render(
    <MemoryRouter>
      <HeroPickerTool
        heroes={heroes}
        retrievedAt="2026-11-07T20:00:00Z"
        enabled
        signedIn
        steamConnected={false}
        onSuggest={onSuggest}
      />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole("combobox", { name: "Your role" }));
  await userEvent.click(
    await screen.findByRole("option", { name: "5 · Hard support" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Suggest heroes" }));
  return screen.getByRole("region", { name: "Your options" });
}
it("keeps the best fits and nonduplicate favorite alternatives together with favorite labels", async () => {
  const options = await requestSuggestions(async (input) => {
    const base = result(input);
    const recommendation = base.recommendations[0];
    return {
      ...base,
      evaluatedHeroes: 20,
      recommendations: [
        { ...recommendation, hero: heroes[1] },
        { ...recommendation, favorite: true },
      ],
      favoriteRecommendations: [
        { ...recommendation, favorite: true },
        { ...recommendation, hero: heroes[0], favorite: true, fit: 2 },
        { ...recommendation, hero: heroes[0], favorite: true, fit: 2 },
      ],
    };
  });
  const best = within(options).getByRole("region", { name: "Best draft fits" });
  const favorites = within(options).getByRole("region", {
    name: "From your favorites",
  });
  expect(within(best).getByRole("heading", { name: "Axe" })).toBeDefined();
  expect(
    within(best).getByRole("heading", { name: "Crystal Maiden" }),
  ).toBeDefined();
  expect(within(best).getAllByText("Favorite")).toHaveLength(1);
  expect(
    within(favorites).getByRole("heading", { name: "Anti-Mage" }),
  ).toBeDefined();
  expect(within(favorites).getAllByText("Favorite")).toHaveLength(1);
  expect(
    within(options).getAllByRole("heading", { name: "Crystal Maiden" }),
  ).toHaveLength(1);
  expect(
    within(options).getAllByRole("heading", { name: "Anti-Mage" }),
  ).toHaveLength(1);
  expect(
    within(options).getByText(/Assessed 20 available heroes/),
  ).toBeDefined();
  act(() => setLocale("es", false));
  expect(
    within(options).getByRole("region", {
      name: "Mejores opciones para el draft",
    }),
  ).toBeDefined();
  expect(
    within(options).getByRole("region", { name: "Entre tus favoritos" }),
  ).toBeDefined();
  expect(within(options).getAllByText("Favorito")).toHaveLength(2);
});
it.each(["legacy", "empty", "overlapping"] as const)(
  "renders general recommendations without an extra favorites section for %s favorites",
  async (variant) => {
    const options = await requestSuggestions(async (input) => {
      const base = result(input);
      return {
        ...base,
        favoriteRecommendations:
          variant === "legacy"
            ? undefined
            : variant === "empty"
              ? []
              : [{ ...base.recommendations[0], favorite: true }],
      };
    });
    expect(
      within(options).getByRole("region", { name: "Best draft fits" }),
    ).toBeDefined();
    expect(
      within(options).getByRole("heading", { name: "Crystal Maiden" }),
    ).toBeDefined();
    expect(
      within(options).queryByRole("region", { name: "From your favorites" }),
    ).toBeNull();
    expect(within(options).queryByText("Favorite")).toBeNull();
  },
);
it("lets guests prepare and reset a draft with searchable portraits while keeping picks exclusive", async () => {
  const suggest = vi.fn();
  render(
    <MemoryRouter>
      <HeroPickerTool
        heroes={heroes}
        retrievedAt="2026-11-07T20:00:00Z"
        enabled
        signedIn={false}
        steamConnected={false}
        onSuggest={suggest}
      />
    </MemoryRouter>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Add Axe to allied picks" }),
  );
  await userEvent.click(screen.getByRole("button", { name: /Enemy picks.*0/ }));
  expect(
    (
      screen.getByRole("button", {
        name: "Add Axe to enemy picks",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  await userEvent.type(
    screen.getByRole("searchbox", { name: "Find a hero" }),
    "Crystal",
  );
  expect(
    screen.queryByRole("button", { name: "Add Anti-Mage to enemy picks" }),
  ).toBeNull();
  await userEvent.click(
    screen.getByRole("button", { name: "Add Crystal Maiden to enemy picks" }),
  );
  expect(
    screen.getAllByRole("button", {
      name: "Remove Crystal Maiden from enemy picks",
    }),
  ).toHaveLength(2);
  expect(
    screen.getByRole("link", { name: "Sign in for suggestions" }),
  ).toBeDefined();
  expect(suggest).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "New draft" }));
  expect(
    screen.queryByRole("button", { name: "Remove Axe from allied picks" }),
  ).toBeNull();
});
it("allows draft preparation without a key and does not show paid actions", () => {
  render(
    <MemoryRouter>
      <HeroPickerTool
        heroes={heroes}
        retrievedAt="2026-11-07T20:00:00Z"
        enabled={false}
        signedIn
        steamConnected={false}
        onSuggest={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByText("AI suggestions aren’t available yet."),
  ).toBeDefined();
  expect(screen.queryByRole("button", { name: "Suggest heroes" })).toBeNull();
});
it("marks a delayed result as an earlier draft after edits instead of presenting it as current", async () => {
  let finish!: (r: HeroDraftResult) => void;
  let submitted!: HeroDraftInput;
  const pending = new Promise<HeroDraftResult>((r) => (finish = r));
  render(
    <MemoryRouter>
      <HeroPickerTool
        heroes={heroes}
        retrievedAt="2026-11-07T20:00:00Z"
        enabled
        signedIn
        steamConnected={false}
        onSuggest={async (input) => {
          submitted = input;
          return pending;
        }}
      />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole("combobox", { name: "Your role" }));
  await userEvent.click(
    await screen.findByRole("option", { name: "5 · Hard support" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Suggest heroes" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Add Axe to allied picks" }),
  );
  await act(async () => {
    finish(result(submitted));
    await pending;
  });
  const results = screen.getByRole("region", { name: "Your options" });
  expect(within(results).getByText("Earlier draft")).toBeDefined();
  expect(within(results).getByText(/The draft changed/)).toBeDefined();
});
it("discards a response from before New draft", async () => {
  let finish!: (r: HeroDraftResult) => void;
  let submitted!: HeroDraftInput;
  const pending = new Promise<HeroDraftResult>((r) => (finish = r));
  render(
    <MemoryRouter>
      <HeroPickerTool
        heroes={heroes}
        retrievedAt="2026-11-07T20:00:00Z"
        enabled
        signedIn
        steamConnected={false}
        onSuggest={async (input) => {
          submitted = input;
          return pending;
        }}
      />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole("combobox", { name: "Your role" }));
  await userEvent.click(
    await screen.findByRole("option", { name: "5 · Hard support" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Suggest heroes" }));
  await userEvent.click(screen.getByRole("button", { name: "New draft" }));
  await act(async () => {
    finish(result(submitted));
    await pending;
  });
  expect(
    within(screen.getByRole("region", { name: "Your options" })).queryByRole(
      "heading",
      { name: "Crystal Maiden" },
    ),
  ).toBeNull();
});
it("labels retained suggestions outdated after an unchanged-draft request fails", async () => {
  let calls = 0;
  render(
    <MemoryRouter>
      <HeroPickerTool
        heroes={heroes}
        retrievedAt="2026-11-07T20:00:00Z"
        enabled
        signedIn
        steamConnected={false}
        onSuggest={async (input) => {
          if (calls++) throw new Error("Controlled outage");
          return result(input);
        }}
      />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole("combobox", { name: "Your role" }));
  await userEvent.click(
    await screen.findByRole("option", { name: "5 · Hard support" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Suggest heroes" }));
  await screen.findByRole("heading", { name: "Crystal Maiden" });
  await userEvent.click(screen.getByRole("button", { name: "Suggest heroes" }));
  await screen.findByText("Controlled outage");
  expect(screen.getByText("Previous suggestions")).toBeDefined();
  expect(screen.queryByText(/Assessed 1 available/)).toBeNull();
  expect(screen.getByRole("heading", { name: "Crystal Maiden" })).toBeDefined();
});
it("marks an idle result expired when its cache lifetime elapses", async () => {
  render(
    <MemoryRouter>
      <HeroPickerTool
        heroes={heroes}
        retrievedAt="2026-11-07T20:00:00Z"
        enabled
        signedIn
        steamConnected={false}
        onSuggest={async (input) => ({
          ...result(input),
          expiresAt: new Date(Date.now() + 100).toISOString(),
        })}
      />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole("combobox", { name: "Your role" }));
  await userEvent.click(
    await screen.findByRole("option", { name: "5 · Hard support" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Suggest heroes" }));
  await screen.findByText("Previous suggestions");
  expect(
    screen.getByText(/These suggestions are over fifteen minutes old/),
  ).toBeDefined();
});
it("discards a pending local import after New draft but accepts a fresh explicit import", async () => {
  render(
    <MemoryRouter>
      <HeroPickerTool
        heroes={heroes}
        retrievedAt="2026-11-07T20:00:00Z"
        enabled
        signedIn
        steamConnected={false}
        onSuggest={vi.fn()}
      />
    </MemoryRouter>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Capture local import" }),
  );
  const pending = queuedImport.run!;
  await userEvent.click(screen.getByRole("button", { name: "New draft" }));
  await act(async () => pending({ allies: [1], enemies: [], bans: [] }));
  expect(
    screen.queryAllByRole("button", {
      name: "Remove Anti-Mage from allied picks",
    }),
  ).toHaveLength(0);
  await userEvent.click(
    screen.getByRole("button", { name: "Capture local import" }),
  );
  await act(async () =>
    queuedImport.run!({ allies: [2], enemies: [], bans: [] }),
  );
  expect(
    screen.getAllByRole("button", { name: "Remove Axe from allied picks" })
      .length,
  ).toBeGreaterThan(0);
});
