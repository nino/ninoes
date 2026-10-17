import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
   useBlogDailyViews,
   useBlogTopPages,
   useBlogTopReferrers,
} from "~/hooks/useSupabase";
import type { BlogDailyViews, BlogTopPage, BlogTopReferrer } from "~/model/types";
import BlogStats from "./blog-stats";

vi.mock("~/hooks/useSupabase", () => ({
   useBlogDailyViews: vi.fn(),
   useBlogTopPages: vi.fn(),
   useBlogTopReferrers: vi.fn(),
}));
vi.mock("~/server/guards.server", () => ({ requireUser: vi.fn() }));

function result<T>(state: {
   data?: T;
   isPending?: boolean;
   isError?: boolean;
}): UseQueryResult<T> {
   return {
      data: state.data,
      isPending: state.isPending ?? false,
      isError: state.isError ?? false,
   } as unknown as UseQueryResult<T>;
}

const DAYS: Array<BlogDailyViews> = [
   { day: "2026-10-15", views: 12, visitors: 5 },
   { day: "2026-10-16", views: 0, visitors: 0 },
   { day: "2026-10-17", views: 6, visitors: 4 },
];
const PAGES: Array<BlogTopPage> = [
   { path: "/waves/", views: 10, visitor_days: 4 },
   { path: "/latex/", views: 8, visitor_days: 5 },
];
const REFERRERS: Array<BlogTopReferrer> = [
   { referrer_host: "news.ycombinator.com", views: 7, visitor_days: 6 },
];

function respondWith({
   days = DAYS,
   pages = PAGES,
   referrers = REFERRERS,
   isError = false,
}: {
   days?: Array<BlogDailyViews>;
   pages?: Array<BlogTopPage>;
   referrers?: Array<BlogTopReferrer>;
   isError?: boolean;
} = {}): void {
   vi.mocked(useBlogDailyViews).mockReturnValue(result({ data: days, isError }));
   vi.mocked(useBlogTopPages).mockReturnValue(result({ data: pages }));
   vi.mocked(useBlogTopReferrers).mockReturnValue(result({ data: referrers }));
}

beforeEach(() => {
   vi.useFakeTimers({ toFake: ["Date"] });
   vi.setSystemTime(new Date("2026-10-17T12:00:00Z"));
   // jsdom has no layout, so report a fixed width for the chart.
   vi.stubGlobal(
      "ResizeObserver",
      class {
         callback: ResizeObserverCallback;
         constructor(callback: ResizeObserverCallback) {
            this.callback = callback;
         }
         observe(): void {
            const entry = {
               contentRect: { width: 600 },
            } as unknown as ResizeObserverEntry;
            this.callback([entry], this as unknown as ResizeObserver);
         }
         disconnect(): void {}
      },
   );
});

afterEach(() => {
   cleanup();
   vi.useRealTimers();
   vi.unstubAllGlobals();
   vi.clearAllMocks();
});

test("shows totals, a bar per day, and linked tables", () => {
   respondWith();
   render(<BlogStats />);

   expect(screen.getByText("Page views").nextSibling?.textContent).toBe("18");
   expect(screen.getByText("Visitors per day").nextSibling?.textContent).toBe("3");

   const chart = screen.getByRole("img", { name: /Views and visitors per day/ });
   expect(chart.getAttribute("aria-label")).toBe(
      "Views and visitors per day, 15 Oct 2026 to 17 Oct 2026",
   );
   // Days with no views still get a hover tooltip.
   expect(within(chart).getByText("16 Oct 2026: 0 views, 0 visitors")).toBeTruthy();
   expect(within(chart).getByText("15 Oct 2026: 12 views, 5 visitors")).toBeTruthy();

   expect(screen.getByRole("link", { name: "/waves/" }).getAttribute("href")).toBe(
      "https://ninoan.com/waves/",
   );
   expect(
      screen.getByRole("link", { name: "news.ycombinator.com" }).getAttribute("href"),
   ).toBe("https://news.ycombinator.com");
});

test("asks for the last 30 days by default, and other ranges when picked", () => {
   respondWith();
   render(<BlogStats />);

   expect(useBlogDailyViews).toHaveBeenLastCalledWith({
      fromDay: "2026-09-18",
      toDay: "2026-10-17",
   });
   expect(
      screen.getByRole("button", { name: "30 days" }).getAttribute("aria-pressed"),
   ).toBe("true");

   fireEvent.click(screen.getByRole("button", { name: "7 days" }));

   expect(useBlogDailyViews).toHaveBeenLastCalledWith({
      fromDay: "2026-10-11",
      toDay: "2026-10-17",
   });
   expect(useBlogTopPages).toHaveBeenLastCalledWith({
      fromDay: "2026-10-11",
      toDay: "2026-10-17",
   });
   expect(
      screen.getByRole("button", { name: "7 days" }).getAttribute("aria-pressed"),
   ).toBe("true");
});

test("says so when a range has no views, instead of drawing an empty chart", () => {
   respondWith({
      days: DAYS.map((d) => ({ ...d, views: 0, visitors: 0 })),
      pages: [],
      referrers: [],
   });
   render(<BlogStats />);

   expect(screen.getByText("No page views in this range yet.")).toBeTruthy();
   expect(screen.queryByRole("img")).toBeNull();
   expect(screen.getByText("No pages viewed in this range.")).toBeTruthy();
   expect(screen.getByText("No visits from other sites in this range.")).toBeTruthy();
});

test("shows a message if the stats can't be loaded", () => {
   respondWith({ isError: true });
   render(<BlogStats />);

   expect(screen.getByText("Couldn’t load the stats.")).toBeTruthy();
   expect(screen.queryByRole("table")).toBeNull();
});
