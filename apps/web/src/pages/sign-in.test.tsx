// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { SignInPage } from "./sign-in";
import { setLocale } from "../i18n";

const state = vi.hoisted(() => ({
  config: { steamEnabled: true } as { steamEnabled: boolean } | undefined,
  login: vi.fn(async (_input: unknown) => ({
    error: null as null | { message: string },
  })),
}));
vi.mock("../api/generated/tito", () => ({
  useGetAppConfig: () => ({ data: state.config }),
}));
vi.mock("../lib/auth", () => ({
  authClient: {
    useSession: () => ({ data: null }),
    steam: { login: state.login },
  },
}));
afterEach(() => {
  cleanup();
  state.config = { steamEnabled: true };
  state.login.mockReset();
  state.login.mockResolvedValue({ error: null });
  setLocale("en", false);
});

it("offers only Steam login and starts the account flow without asking for email", async () => {
  render(
    <MemoryRouter>
      <SignInPage />
    </MemoryRouter>,
  );
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Send sign-in link" }),
  ).toBeNull();
  await userEvent.click(
    screen.getByRole("button", { name: "Continue with Steam" }),
  );
  expect(state.login).toHaveBeenCalledWith({
    callbackURL: "/account",
    errorCallbackURL: "/signin",
  });
});

it("does not offer another login method while Steam availability is loading or disabled", () => {
  state.config = undefined;
  const { rerender } = render(
    <MemoryRouter>
      <SignInPage />
    </MemoryRouter>,
  );
  expect(
    screen
      .getByRole("button", { name: "Continue with Steam" })
      .hasAttribute("disabled"),
  ).toBe(true);
  state.config = { steamEnabled: false };
  rerender(
    <MemoryRouter>
      <SignInPage />
    </MemoryRouter>,
  );
  expect(
    screen
      .getByRole("button", { name: "Continue with Steam" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(screen.queryByRole("textbox")).toBeNull();
});

it("shows Steam errors and supports Spanish", async () => {
  setLocale("es", false);
  state.login.mockResolvedValue({ error: { message: "Steam is unavailable" } });
  render(
    <MemoryRouter>
      <SignInPage />
    </MemoryRouter>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Continuar con Steam" }),
  );
  expect(screen.getByText("Steam is unavailable")).toBeDefined();
  expect(screen.queryByRole("textbox")).toBeNull();
});
