import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
   useBlogDailyViews,
   useBlogTopPages,
   useBlogTopReferrers,
} from "~/hooks/useSupabase";
import type { BlogDailyViews, BlogTopPage, BlogTopReferrer } from "~/model/types";
import { stubResizeObserver } from "~/test/stubResizeObserver";
import BlogStats from "./blog-stats";

vi.mock("~/hooks/useSupabase", () => ({
   useBlogDailyViews: vi.fn(),
   useBlogTopPages: vi.fn(),
   useBlogTopReferrers: vi.fn(),
}));
vi.mock("~/server/guards.server", () => ({ requireUser: vi.fn() }));
vi.mock("react-router", async (importOriginal) => ({
   ...(await importOriginal<typeof import("react-router")>()),
   useLoaderData: () => ({ userId: "user-1" }),
}));

type QueryState<T> = {
   data?: T;
   isPending?: boolean;
   isError?: boolean;
   isPlaceholderData?: boolean;
};

function result<T>(state: QueryState<T>): UseQueryResult<T> {
   return {
      data: state.data,
      isPending: state.isPending ?? false,
      isError: state.isError ?? false,
      isPlaceholderData: state.isPlaceholderData ?? false,
   } as unknown as UseQueryResult<T>;
}

const DAYS: Array<BlogDailyViews> = [
   { day: "2027-03-13", views: 12, visitors: 5 },
   { day: "2027-03-14", views: 0, visitors: 0 },
   { day: "2027-03-15", views: 6, visitors: 4 },
];
const PAGES: Array<BlogTopPage> = [
   { path: "/waves/", views: 10, visitor_days: 4 },
   { path: "/latex/", views: 8, visitor_days: 5 },
];
const REFERRERS: Array<BlogTopReferrer> = [
   { referrer_host: "news.ycombinator.com", views: 7, visitor_days: 6 },
];

function respondWith({
   daily = { data: DAYS },
   pages = { data: PAGES },
   referrers = { data: REFERRERS },
}: {
   daily?: QueryState<Array<BlogDailyViews>>;
   pages?: QueryState<Array<BlogTopPage>>;
   referrers?: QueryState<Array<BlogTopReferrer>>;
} = {}): void {
   vi.mocked(useBlogDailyViews).mockReturnValue(result(daily));
   vi.mocked(useBlogTopPages).mockReturnValue(result(pages));
   vi.mocked(useBlogTopReferrers).mockReturnValue(result(referrers));
}

function setToday(iso: string): void {
   vi.setSystemTime(new Date(iso));
}

beforeEach(() => {
   vi.useFakeTimers({ toFake: ["Date"] });
   setToday("2027-03-15T12:00:00Z");
   stubResizeObserver(600);
});

afterEach(() => {
   cleanup();
   vi.useRealTimers();
   vi.unstubAllGlobals();
   vi.clearAllMocks();
});

test("shows totals, the chart, and the top pages and referring sites", () => {
   respondWith();
   render(<BlogStats />);

   expect(screen.getByText("Page views").nextSibling?.textContent).toBe("18");
   // Today (the 15th) isn't over, so the average is (5 + 0) / 2.
   expect(screen.getByText("Visitors per day").nextSibling?.textContent).toBe("2.5");

   expect(screen.getByRole("img", { name: /Views and visitors per day/ })).toBeTruthy();

   expect(screen.getByRole("link", { name: "/waves/" }).getAttribute("href")).toBe(
      "https://ninoan.com/waves/",
   );
   expect(screen.getByRole("heading", { name: "Top pages" })).toBeTruthy();
   expect(screen.getAllByText("The 25 with the most views.")).toHaveLength(2);
});

test("shows referring sites as text, not links", () => {
   respondWith();
   render(<BlogStats />);

   expect(screen.getByText("news.ycombinator.com")).toBeTruthy();
   expect(screen.queryByRole("link", { name: "news.ycombinator.com" })).toBeNull();
});

test("keeps the tables in the database's order: their headers don't sort", () => {
   respondWith();
   render(<BlogStats />);

   const pagesTable = screen
      .getAllByRole("table")
      .find((table) => within(table).queryByText("/waves/"));
   if (!pagesTable) throw new Error("no pages table");
   fireEvent.click(within(pagesTable).getByText("Visitors"));

   const paths = within(pagesTable)
      .getAllByRole("link")
      .map((link) => link.textContent);
   expect(paths).toEqual(["/waves/", "/latex/"]);
});

describe("date ranges", () => {
   test("asks for the last 30 days by default, for the signed-in user", () => {
      respondWith();
      render(<BlogStats />);

      expect(useBlogDailyViews).toHaveBeenLastCalledWith("user-1", {
         fromDay: "2027-02-14",
         toDay: "2027-03-15",
      });
      expect(
         screen.getByRole("button", { name: "30 days" }).getAttribute("aria-pressed"),
      ).toBe("true");
   });

   test("asks every query for the new range when another is picked", () => {
      respondWith();
      render(<BlogStats />);

      fireEvent.click(screen.getByRole("button", { name: "7 days" }));

      const expected = { fromDay: "2027-03-09", toDay: "2027-03-15" };
      expect(useBlogDailyViews).toHaveBeenLastCalledWith("user-1", expected);
      expect(useBlogTopPages).toHaveBeenLastCalledWith("user-1", expected);
      expect(useBlogTopReferrers).toHaveBeenLastCalledWith("user-1", expected);
   });

   test("doesn't reach back before recording started", () => {
      setToday("2026-10-20T12:00:00Z");
      respondWith();
      render(<BlogStats />);

      expect(useBlogDailyViews).toHaveBeenLastCalledWith("user-1", {
         fromDay: "2026-10-17",
         toDay: "2026-10-20",
      });
   });

   test("moves on to the new day when the page regains focus after midnight", () => {
      setToday("2027-03-15T23:59:00Z");
      respondWith();
      render(<BlogStats />);

      setToday("2027-03-16T00:01:00Z");
      fireEvent.focus(window);

      expect(useBlogDailyViews).toHaveBeenLastCalledWith("user-1", {
         fromDay: "2027-02-15",
         toDay: "2027-03-16",
      });
   });
});

test("keeps showing the previous range, dimmed, while a new one loads", () => {
   respondWith({ daily: { data: DAYS, isPlaceholderData: true } });
   const { container } = render(<BlogStats />);

   expect(screen.getByText("Page views").nextSibling?.textContent).toBe("18");
   expect(container.querySelector("[aria-busy=true]")).not.toBeNull();
});

test("shows placeholders while the first load is in progress", () => {
   respondWith({
      daily: { isPending: true },
      pages: { isPending: true },
      referrers: { isPending: true },
   });
   render(<BlogStats />);

   // The stats and chart placeholder, plus the tables' own.
   expect(screen.getAllByRole("status").length).toBeGreaterThanOrEqual(1);
   expect(screen.queryByText("Page views")).toBeNull();
   expect(screen.queryByText("No pages viewed in this range.")).toBeNull();
});

test("says so when a range has no views, instead of drawing an empty chart", () => {
   respondWith({
      daily: { data: DAYS.map((d) => ({ ...d, views: 0, visitors: 0 })) },
      pages: { data: [] },
      referrers: { data: [] },
   });
   render(<BlogStats />);

   expect(screen.getByText("No page views in this range yet.")).toBeTruthy();
   expect(screen.queryByRole("img")).toBeNull();
   expect(screen.getByText("No pages viewed in this range.")).toBeTruthy();
   expect(screen.getByText("No visits from other sites in this range.")).toBeTruthy();
});

describe("errors", () => {
   test.each(["daily", "pages", "referrers"] as const)(
      "shows a message if the %s query fails",
      (failing) => {
         respondWith({ [failing]: { isError: true } });
         render(<BlogStats />);

         expect(screen.getByText("Couldn’t load the stats.")).toBeTruthy();
         expect(screen.queryByRole("table")).toBeNull();
         expect(screen.queryByText("Page views")).toBeNull();
      },
   );
});
