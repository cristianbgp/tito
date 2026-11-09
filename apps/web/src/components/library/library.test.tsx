// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeroPoolEditor } from "./pool-editor";
import { NoteEditor } from "./match-notebook";
import { FeedbackEditor } from "./review-feedback";
import type { DraftHero } from "../../api/generated/models";
import { setLocale } from "../../i18n";
afterEach(() => {
  cleanup();
  setLocale("en", false);
});
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
    id: 5,
    name: "Crystal Maiden",
    image: null,
    roles: ["Support"],
    attackType: "Ranged",
    attribute: "int",
  },
];
it("saves an explicit unique hero pool with the edited preference", async () => {
  const user = userEvent.setup(),
    save = vi.fn(async () => {});
  render(
    <HeroPoolEditor
      role="5"
      initialEntries={[]}
      heroes={heroes}
      busy={false}
      onSave={save}
    />,
  );
  expect(save).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Crystal Maiden" }));
  expect(screen.queryByRole("button", { name: "Crystal Maiden" })).toBeNull();
  await user.click(
    screen.getByRole("combobox", { name: "Preference · Crystal Maiden" }),
  );
  await user.click(await screen.findByRole("option", { name: "Comfortable" }));
  await user.click(screen.getByRole("button", { name: "Save pool" }));
  expect(save).toHaveBeenCalledWith([{ heroId: 5, preference: "comfortable" }]);
});
it("keeps an explicit zero bookmark and confirmed role and rejects duplicate tags", async () => {
  const user = userEvent.setup(),
    save = vi.fn(async () => {});
  render(
    <NoteEditor
      matchId="900"
      note={null}
      busy={false}
      onSave={save}
      onDelete={async () => {}}
    />,
  );
  await user.type(screen.getByLabelText("Private note"), "Watch this opening");
  await user.type(
    screen.getByLabelText("Tags (comma separated, up to 8)"),
    "laning, laning",
  );
  await user.type(screen.getByLabelText("Replay bookmark (seconds)"), "0");
  await user.click(
    screen.getByRole("combobox", { name: "Role I played (confirmed by me)" }),
  );
  await user.click(
    await screen.findByRole("option", { name: "Position 5 · Hard support" }),
  );
  await user.click(screen.getByRole("button", { name: "Save note" }));
  expect(save).not.toHaveBeenCalled();
  await screen.findByRole("alert");
  await user.clear(screen.getByLabelText("Tags (comma separated, up to 8)"));
  await user.type(
    screen.getByLabelText("Tags (comma separated, up to 8)"),
    "laning, vision",
  );
  await user.click(screen.getByRole("button", { name: "Save note" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      text: "Watch this opening",
      tags: ["laning", "vision"],
      actualRole: "5",
      bookmarkSeconds: 0,
    }),
  );
});
it("keeps role and bookmark unknown until explicitly provided", async () => {
  const user = userEvent.setup(),
    save = vi.fn(async () => {});
  render(
    <NoteEditor
      matchId="901"
      note={null}
      busy={false}
      onSave={save}
      onDelete={async () => {}}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Save note" }));
  expect(save).toHaveBeenCalledWith({
    text: "",
    tags: [],
    actualRole: null,
    bookmarkSeconds: null,
  });
});
it("translates an existing validation message without losing the note draft", async () => {
  const user = userEvent.setup();
  render(
    <NoteEditor
      matchId="902"
      note={null}
      busy={false}
      onSave={vi.fn(async () => {})}
      onDelete={async () => {}}
    />,
  );
  await user.type(screen.getByLabelText("Private note"), "Keep my draft");
  await user.type(
    screen.getByLabelText("Tags (comma separated, up to 8)"),
    "vision, vision",
  );
  await user.click(screen.getByRole("button", { name: "Save note" }));
  expect(screen.getByRole("alert").textContent).toContain("unique tags");
  act(() => setLocale("es", false));
  expect(screen.getByRole("alert").textContent).toBe(
    "Usa hasta 8 etiquetas únicas, de un máximo de 40 caracteres cada una.",
  );
  expect(
    (screen.getByLabelText("Nota privada") as HTMLTextAreaElement).value,
  ).toBe("Keep my draft");
  expect(
    (
      screen.getByLabelText(
        "Etiquetas (separadas por comas, hasta 8)",
      ) as HTMLInputElement
    ).value,
  ).toBe("vision, vision");
});
it("records review feedback only after the user explicitly saves it", async () => {
  const user = userEvent.setup(),
    save = vi.fn(async () => {});
  render(
    <FeedbackEditor matchId="900" initial={null} busy={false} onSave={save} />,
  );
  await user.click(screen.getByRole("button", { name: "Incorrect" }));
  expect(save).not.toHaveBeenCalled();
  await user.type(
    screen.getByLabelText("Optional feedback (up to 500 characters)"),
    "The explanation missed the replay context.",
  );
  await user.click(screen.getByRole("button", { name: "Save feedback" }));
  expect(save).toHaveBeenCalledWith({
    rating: "incorrect",
    comment: "The explanation missed the replay context.",
  });
});
