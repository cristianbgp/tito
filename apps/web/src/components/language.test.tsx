// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { LanguageControl } from "./language";
import { ToolsPage } from "../pages/tools";
import { setLocale } from "../i18n";
import { useState } from "react";
function Harness() {
  const [note, setNote] = useState("");
  return (
    <MemoryRouter>
      <LanguageControl compact />
      <input
        aria-label="Draft note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <ToolsPage />
    </MemoryRouter>
  );
}
afterEach(() => {
  cleanup();
  localStorage.clear();
  setLocale("en");
});
it("switches mounted page, tool cards, accessible controls and title without losing user input", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.type(
    screen.getByRole("textbox", { name: "Draft note" }),
    "keep this draft",
  );
  await user.click(screen.getByRole("combobox", { name: "Language / Idioma" }));
  await user.click(await screen.findByRole("option", { name: "Español" }));
  expect(
    screen.getByRole("heading", { name: "Tus herramientas" }),
  ).toBeDefined();
  expect(
    screen.getByRole("link", { name: /Selector de héroes/ }),
  ).toBeDefined();
  expect(
    (screen.getByRole("textbox", { name: "Draft note" }) as HTMLInputElement)
      .value,
  ).toBe("keep this draft");
  expect(document.title).toBe("Tus herramientas | Tito");
  expect(document.documentElement.lang).toBe("es");
  expect(
    document
      .querySelector('meta[property="og:locale"]')
      ?.getAttribute("content"),
  ).toBe("es_ES");
  expect(
    document.querySelector("meta[name=description]")?.getAttribute("content"),
  ).toBe("Prepara tu draft y revisa tus partidas.");
  expect(localStorage.getItem("tito:locale")).toBe("es");
  await user.click(screen.getByRole("combobox", { name: "Language / Idioma" }));
  await user.click(await screen.findByRole("option", { name: "English" }));
  expect(screen.getByRole("heading", { name: "Your tools" })).toBeDefined();
});
it("synchronizes another tab and defaults to English when the preference is removed", () => {
  render(<Harness />);
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", { key: "tito:locale", newValue: "es" }),
    ),
  );
  expect(
    screen.getByRole("heading", { name: "Tus herramientas" }),
  ).toBeDefined();
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", { key: null, newValue: null }),
    ),
  );
  expect(screen.getByRole("heading", { name: "Your tools" })).toBeDefined();
});
