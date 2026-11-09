// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SidebarToggle, useSidebarPreference } from "./sidebar";

function Harness() {
  const { collapsed, toggle } = useSidebarPreference();
  return (
    <>
      <SidebarToggle collapsed={collapsed} onToggle={toggle} />
      <aside
        id="app-sidebar"
        data-state={collapsed ? "collapsed" : "expanded"}
      />
      <input aria-label="Search" />
      <div contentEditable aria-label="Notes" role="textbox" />
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("collapses through the button and restores the saved preference on remount", async () => {
  const user = userEvent.setup();
  const view = render(<Harness />);
  const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(toggle.getAttribute("aria-controls")).toBe("app-sidebar");
  await user.click(toggle);
  expect(localStorage.getItem("tito:sidebar")).toBe("collapsed");
  expect(
    screen
      .getByRole("button", { name: "Expand sidebar" })
      .getAttribute("aria-expanded"),
  ).toBe("false");
  view.unmount();
  render(<Harness />);
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeDefined();
  await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
  expect(localStorage.getItem("tito:sidebar")).toBe("expanded");
});

it("supports both shortcuts while leaving editing, repeats, and mobile alone", () => {
  render(<Harness />);
  fireEvent.keyDown(window, { key: "b", metaKey: true });
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeDefined();
  fireEvent.keyDown(window, { key: "b", ctrlKey: true, repeat: true });
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeDefined();
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Search" }), {
    key: "b",
    ctrlKey: true,
  });
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Notes" }), {
    key: "b",
    metaKey: true,
  });
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeDefined();
  fireEvent.keyDown(window, { key: "b", ctrlKey: true, shiftKey: true });
  fireEvent.keyDown(window, { key: "b", metaKey: true, altKey: true });
  fireEvent.keyDown(window, { key: "b" });
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeDefined();
  fireEvent.keyDown(window, { key: "b", ctrlKey: true });
  expect(
    screen.getByRole("button", { name: "Collapse sidebar" }),
  ).toBeDefined();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  fireEvent.keyDown(window, { key: "b", metaKey: true });
  expect(
    screen.getByRole("button", { name: "Collapse sidebar" }),
  ).toBeDefined();
});

it("synchronizes other tabs, resets removed preferences, and tolerates unavailable storage", async () => {
  const user = userEvent.setup();
  const view = render(<Harness />);
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "tito:sidebar",
        newValue: "collapsed",
      }),
    ),
  );
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeDefined();
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "tito:appearance",
        newValue: "light",
      }),
    ),
  );
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeDefined();
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", { key: null, newValue: null }),
    ),
  );
  expect(
    screen.getByRole("button", { name: "Collapse sidebar" }),
  ).toBeDefined();
  view.unmount();
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage denied");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Storage denied");
  });
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeDefined();
});
