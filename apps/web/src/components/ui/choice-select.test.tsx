// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ChoiceSelect, type ChoiceItem } from "./choice-select";
afterEach(cleanup);

function Fixture({
  items,
  searchable = false,
}: {
  items: ChoiceItem[];
  searchable?: boolean;
}) {
  const [value, setValue] = useState(items[0].value);
  return (
    <>
      <label htmlFor="choice">Match</label>
      <ChoiceSelect
        id="choice"
        label="Match"
        items={items}
        value={value}
        onChange={setValue}
        searchable={searchable}
      />
      <output>{value || "unrecorded"}</output>
    </>
  );
}
test("searches all records beyond the rendered window and shows readable selected context", async () => {
  const user = userEvent.setup();
  render(
    <Fixture
      searchable
      items={Array.from({ length: 1000 }, (_, i) => ({
        value: String(i),
        label: `Hero ${i}`,
        description: `Match #${i} · Nov 8`,
      }))}
    />,
  );
  await user.click(screen.getByRole("combobox", { name: /^Match$/ }));
  expect((await screen.findAllByRole("option")).length).toBeLessThanOrEqual(60);
  await user.type(
    await screen.findByRole("combobox", { name: "Search Match" }),
    "#999",
  );
  await user.click(await screen.findByRole("option", { name: /Hero 999/ }));
  expect(screen.getByRole("status").textContent).toBe("999");
  expect(
    screen.getByRole("combobox", { name: /^Match$/ }).textContent,
  ).toContain("Match #999");
});
test("keeps the selected value on Escape, reports empty search, and supports an explicit empty option", async () => {
  const user = userEvent.setup();
  render(
    <Fixture
      searchable
      items={[
        { value: "5", label: "Crystal Maiden" },
        { value: "", label: "Not recorded" },
      ]}
    />,
  );
  const trigger = screen.getByRole("combobox", { name: /^Match$/ });
  await user.click(trigger);
  await user.type(
    await screen.findByRole("combobox", { name: "Search Match" }),
    "no such hero",
  );
  expect(await screen.findByText("No options found.")).toBeTruthy();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("status").textContent).toBe("5");
  expect(document.activeElement).toBe(trigger);
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name: "Not recorded" }));
  expect(screen.getByRole("status").textContent).toBe("unrecorded");
});
