import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { BlogDailyViews } from "~/model/types";
import { restoreResizeObserver, stubResizeObserver } from "~/test/stubResizeObserver";
import { DailyViewsChart } from "./DailyViewsChart";

afterEach(() => {
   cleanup();
   restoreResizeObserver();
});

/** `count` consecutive days from 1 March 2027, with views = day number. */
function days(count: number): Array<BlogDailyViews> {
   return Array.from({ length: count }, (_, i) => ({
      day: new Date(Date.UTC(2027, 2, 1 + i)).toISOString().slice(0, 10),
      views: i,
      visitors: Math.floor(i / 2),
   }));
}

function renderAt(width: number, data: Array<BlogDailyViews>): HTMLElement {
   stubResizeObserver(width);
   return render(<DailyViewsChart days={data} />).container;
}

describe("date labels", () => {
   test("fit more labels on a wide chart than a narrow one", () => {
      const wide = renderAt(1000, days(30)).querySelectorAll("[data-date-label]").length;
      cleanup();
      const narrow = renderAt(320, days(30)).querySelectorAll(
         "[data-date-label]",
      ).length;

      expect(narrow).toBeLessThan(wide);
      // 320 px leaves 272 px for the bars: room for four labels at 64 px each.
      expect(narrow).toBeLessThanOrEqual(4);
      expect(narrow).toBeGreaterThanOrEqual(2);
   });

   test("label every day when there's room", () => {
      const labels = renderAt(1000, days(7)).querySelectorAll("[data-date-label]");
      expect(labels).toHaveLength(7);
   });
});

test("gives every day a hover target, side by side with no gaps", () => {
   const targets = [...renderAt(600, days(30)).querySelectorAll("[data-day-target]")];

   expect(targets).toHaveLength(30);
   const edges = targets.map((t) => ({
      x: Number(t.getAttribute("x")),
      width: Number(t.getAttribute("width")),
   }));
   for (let i = 1; i < edges.length; i++) {
      expect(edges[i].x).toBeCloseTo(edges[i - 1].x + edges[i - 1].width);
   }
   expect(edges[0].x).toBeGreaterThanOrEqual(0);
});

describe("the readout below the chart", () => {
   test("shows a day's numbers on hover, and clears when the mouse leaves", () => {
      const container = renderAt(600, days(7));
      const targets = container.querySelectorAll("[data-day-target]");

      fireEvent.pointerEnter(targets[0]);
      expect(screen.getByText("1 Mar 2027: 0 views, 0 visitors")).toBeTruthy();

      fireEvent.pointerEnter(targets[3]);
      expect(screen.getByText("4 Mar 2027: 3 views, 1 visitor")).toBeTruthy();

      fireEvent.pointerLeave(screen.getByRole("img"), { pointerType: "mouse" });
      expect(
         screen.getByText("Hover over or tap a day to see its numbers."),
      ).toBeTruthy();
   });

   test("keeps a tapped day after the finger lifts", () => {
      const container = renderAt(600, days(7));

      fireEvent.click(container.querySelectorAll("[data-day-target]")[2]);
      fireEvent.pointerLeave(screen.getByRole("img"), { pointerType: "touch" });

      expect(screen.getByText("3 Mar 2027: 2 views, 1 visitor")).toBeTruthy();
   });

   test("steps through days with the arrow keys", () => {
      renderAt(600, days(7));
      const chart = screen.getByRole("img");

      fireEvent.focus(chart);
      expect(screen.getByText("7 Mar 2027: 6 views, 3 visitors")).toBeTruthy();

      fireEvent.keyDown(chart, { key: "ArrowLeft" });
      expect(screen.getByText("6 Mar 2027: 5 views, 2 visitors")).toBeTruthy();

      fireEvent.keyDown(chart, { key: "Home" });
      expect(screen.getByText("1 Mar 2027: 0 views, 0 visitors")).toBeTruthy();

      fireEvent.keyDown(chart, { key: "ArrowLeft" });
      expect(screen.getByText("1 Mar 2027: 0 views, 0 visitors")).toBeTruthy();
   });
});

test("lists every day in a table for screen readers", () => {
   renderAt(600, days(7));
   const table = screen.getByRole("table");

   expect(within(table).getAllByRole("row")).toHaveLength(8);
   expect(within(table).getByRole("rowheader", { name: "4 Mar 2027" })).toBeTruthy();
});
