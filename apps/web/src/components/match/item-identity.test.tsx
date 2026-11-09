// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { ItemIdentity } from "./item-identity";

afterEach(cleanup);
test("shows the catalog name and a decorative icon that can fail without losing the name", () => {
  const { container } = render(
    <ItemIdentity
      name="Iron Branch"
      image="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/branches.png"
      itemId={16}
    />,
  );
  expect(screen.getByText("Iron Branch")).toBeTruthy();
  const icon = container.querySelector("img")!;
  expect(icon.getAttribute("alt")).toBe("");
  fireEvent.error(icon);
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText("Iron Branch")).toBeTruthy();
});
test("keeps unknown metadata honest and humanizes an available source key", () => {
  render(
    <>
      <ItemIdentity itemId={99999} />
      <ItemIdentity itemKey="power_treads" />
    </>,
  );
  expect(screen.getByText("Unknown item")).toBeTruthy();
  expect(screen.getByText("ID 99999")).toBeTruthy();
  expect(screen.getByText("Power treads")).toBeTruthy();
  expect(screen.queryByText("Item #99999")).toBeNull();
});
