// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdvantageChart } from "./advantage-chart";

beforeEach(() => {
  // jsdom has no layout; Base UI needs the measured track/handle to place its input.
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
});

it("explores actual samples by keyboard and exposes numeric data from the compact preview", async () => {
  const user = userEvent.setup();
  render(
    <AdvantageChart
      title="Gold advantage"
      compact
      points={[
        { time: 0, value: 0 },
        { time: 60, value: null },
        { time: 180, value: -2000 },
      ]}
    />,
  );
  await user.click(screen.getByText("Explore timeline"));
  const slider = await screen.findByRole("slider");
  slider.focus();
  await user.keyboard("{ArrowLeft}");
  expect(slider.getAttribute("aria-valuetext")).toBe("1:00: Unavailable");
  await user.keyboard("{Home}");
  expect(slider.getAttribute("aria-valuetext")).toContain("0:00: Even");
  await user.keyboard("{End}");
  expect(slider.getAttribute("aria-valuetext")).toBe(
    "3:00: Dire leads by 2,000",
  );
  await user.click(screen.getByText("View timeline data"));
  const table = screen.getByRole("table", { name: "Gold advantage" });
  expect(within(table).getByText("3:00")).toBeDefined();
  expect(within(table).getByText("Dire leads by 2,000")).toBeDefined();
});

it("keeps a single actual sample visible without offering invalid range movement", async () => {
  render(
    <AdvantageChart title="XP advantage" points={[{ time: 0, value: 0 }]} />,
  );
  const slider = await screen.findByRole("slider");
  expect(slider.getAttribute("aria-valuetext")).toContain("0:00: Even");
  expect(
    slider.hasAttribute("disabled") ||
      slider.getAttribute("aria-disabled") === "true",
  ).toBe(true);
});
