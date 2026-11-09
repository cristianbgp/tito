// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MatchMomentum } from "./match-momentum";
import { setLocale } from "../../i18n";

const gold = [
  { time: 0, value: 0 },
  { time: 60, value: 1000 },
  { time: 180, value: -4000 },
];
const xp = [
  { time: 0, value: 0 },
  { time: 120, value: 300 },
  { time: 180, value: -8000 },
];

beforeEach(() => {
  setLocale("en", false);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const width = this.dataset.slot === "slider-thumb" ? 12 : 300;
      return {
        width,
        height: 36,
        top: 0,
        left: 0,
        right: width,
        bottom: 36,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setLocale("en", false);
});

it("uses one keyboard timeline for both readouts and one table with actual samples", async () => {
  const user = userEvent.setup();
  render(<MatchMomentum gold={gold} xp={xp} />);
  const slider = await screen.findByRole("slider");
  slider.focus();
  await user.keyboard("{ArrowLeft}");
  expect(slider.getAttribute("aria-valuetext")).toContain("2:00");
  expect(
    within(screen.getByRole("region", { name: "Gold advantage" })).getByText(
      "Unavailable",
    ),
  ).toBeDefined();
  expect(
    within(screen.getByRole("region", { name: "XP advantage" })).getByText(
      "Radiant leads by 300",
    ),
  ).toBeDefined();
  await user.keyboard("{Home}");
  expect(
    within(screen.getByRole("region", { name: "Gold advantage" })).getByText(
      "Even",
    ),
  ).toBeDefined();
  expect(
    within(screen.getByRole("region", { name: "XP advantage" })).getByText(
      "Even",
    ),
  ).toBeDefined();
  await user.click(screen.getByRole("button", { name: "View timeline data" }));
  const table = screen.getByRole("table", { name: "Match momentum" });
  const row = within(table).getByRole("row", { name: /2:00/ });
  expect(within(row).getByText("Unavailable")).toBeDefined();
  expect(within(row).getByText("Radiant leads by 300")).toBeDefined();
});

it("synchronizes hovering either plot and selecting a factual gold moment", async () => {
  const user = userEvent.setup();
  render(<MatchMomentum gold={gold} xp={xp} />);
  const plot = screen.getByRole("img", { name: "XP advantage" });
  vi.spyOn(plot, "getBoundingClientRect").mockReturnValue({
    width: 640,
    height: 240,
    left: 0,
    top: 0,
    right: 640,
    bottom: 240,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  const event = new MouseEvent("pointermove", { bubbles: true, clientX: 248 });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  fireEvent(plot, event);
  expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toContain(
    "1:00",
  );
  expect(
    within(screen.getByRole("region", { name: "Gold advantage" })).getByText(
      "Radiant leads by 1,000",
    ),
  ).toBeDefined();
  await user.click(screen.getByRole("button", { name: /Largest gold swing/ }));
  expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toContain(
    "3:00",
  );
  expect(
    screen.getByRole("button", { name: /Largest gold swing/ }).textContent,
  ).toContain("5,000");
});

it("keeps time when switching mobile tabs and localizes information in Spanish", async () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
  setLocale("es", false);
  const user = userEvent.setup();
  render(<MatchMomentum gold={gold} xp={xp} />);
  const slider = await screen.findByRole("slider");
  slider.focus();
  await user.keyboard("{Home}");
  const goldTab = screen.getByRole("tab", { name: "Oro" });
  goldTab.focus();
  await user.keyboard("{ArrowRight}");
  expect(
    screen.getByRole("tab", { name: "XP" }).getAttribute("aria-selected"),
  ).toBe("true");
  expect(slider.getAttribute("aria-valuetext")).toContain("0:00");
  await user.click(
    screen.getByRole("button", { name: "Acerca de los datos de la gráfica" }),
  );
  expect(screen.getByRole("dialog").textContent).toContain(
    "último dato disponible",
  );
});

it("handles single samples, refreshed series, and empty timelines without invalid controls", async () => {
  const { rerender } = render(<MatchMomentum gold={gold} xp={xp} />);
  rerender(<MatchMomentum gold={[{ time: 0, value: 0 }]} xp={[]} />);
  expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toContain(
    "0:00",
  );
  expect(screen.getByRole("slider").hasAttribute("disabled")).toBe(true);
  expect(
    within(screen.getByRole("region", { name: "XP advantage" })).getByText(
      "Unavailable",
    ),
  ).toBeDefined();
  rerender(<MatchMomentum gold={[]} xp={[]} />);
  expect(screen.queryByRole("slider")).toBeNull();
});

it("keeps isolated available samples visible when missing timestamps break the line", () => {
  render(
    <MatchMomentum
      gold={[
        { time: 0, value: 100 },
        { time: 120, value: 200 },
      ]}
      xp={[
        { time: 60, value: 1 },
        { time: 180, value: -300 },
      ]}
    />,
  );
  const goldPlot = screen.getByRole("img", { name: "Gold advantage" });
  const dots = [...goldPlot.querySelectorAll("circle")];
  expect(dots.some((dot) => dot.getAttribute("cx") === "64")).toBe(true);
  expect(dots.some((dot) => dot.getAttribute("cx") === "432")).toBe(true);
});
