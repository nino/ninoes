import {
   afterEach,
   beforeEach,
   describe,
   expect,
   mock,
   setSystemTime,
   test,
} from "bun:test";
import {
   cleanup,
   fireEvent,
   render,
   type RenderResult,
   screen,
   within,
} from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { BlogDailyViews, BlogTopPage, BlogTopReferrer } from "~/model/types";
import { restoreResizeObserver, stubResizeObserver } from "~/test/stubResizeObserver";

const useBlogDailyViews = mock();
const useBlogTopPages = mock();
const useBlogTopReferrers = mock();

// bun test runs every file in one process and module mocks can't be undone, so
// only mock what this page owns. The page is imported after the mocks so the
// real guards module, and the server env it reads, never loads.
await mock.module("~/hooks/useSupabase", () => ({
   useBlogDailyViews,
   useBlogTopPages,
   useBlogTopReferrers,
}));
await mock.module("~/server/guards.server", () => ({ requireUser: mock() }));
const { default: BlogStats } = await import("./blog-stats");

/** Renders the page with its loader data already in place, as after SSR. */
function renderPage(): RenderResult {
   const router = createMemoryRouter(
      [{ id: "stats", path: "/", Component: BlogStats }],
      { hydrationData: { loaderData: { stats: { userId: "user-1" } } } },
   );
   return render(<RouterProvider router={router} />);
}

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
   useBlogDailyViews.mockReturnValue(result(daily));
   useBlogTopPages.mockReturnValue(result(pages));
   useBlogTopReferrers.mockReturnValue(result(referrers));
}

function setToday(iso: string): void {
   setSystemTime(new Date(iso));
}

beforeEach(() => {
   setToday("2027-03-15T12:00:00Z");
   stubResizeObserver(600);
});

afterEach(() => {
   cleanup();
   setSystemTime();
   restoreResizeObserver();
   mock.clearAllMocks();
});

test("shows totals, the chart, and the top pages and referring sites", () => {
   respondWith();
   renderPage();

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
   renderPage();

   expect(screen.getByText("news.ycombinator.com")).toBeTruthy();
   expect(screen.queryByRole("link", { name: "news.ycombinator.com" })).toBeNull();
});

test("keeps the tables in the database's order: their headers don't sort", () => {
   respondWith();
   renderPage();

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
      renderPage();

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
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: "7 days" }));

      const expected = { fromDay: "2027-03-09", toDay: "2027-03-15" };
      expect(useBlogDailyViews).toHaveBeenLastCalledWith("user-1", expected);
      expect(useBlogTopPages).toHaveBeenLastCalledWith("user-1", expected);
      expect(useBlogTopReferrers).toHaveBeenLastCalledWith("user-1", expected);
   });

   test("doesn't reach back before recording started", () => {
      setToday("2026-10-20T12:00:00Z");
      respondWith();
      renderPage();

      expect(useBlogDailyViews).toHaveBeenLastCalledWith("user-1", {
         fromDay: "2026-10-17",
         toDay: "2026-10-20",
      });
   });

   test("moves on to the new day when the page regains focus after midnight", () => {
      setToday("2027-03-15T23:59:00Z");
      respondWith();
      renderPage();

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
   const { container } = renderPage();

   expect(screen.getByText("Page views").nextSibling?.textContent).toBe("18");
   expect(container.querySelector("[aria-busy=true]")).not.toBeNull();
});

test("shows placeholders while the first load is in progress", () => {
   respondWith({
      daily: { isPending: true },
      pages: { isPending: true },
      referrers: { isPending: true },
   });
   renderPage();

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
   renderPage();

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
         renderPage();

         expect(screen.getByText("Couldn’t load the stats.")).toBeTruthy();
         expect(screen.queryByRole("table")).toBeNull();
         expect(screen.queryByText("Page views")).toBeNull();
      },
   );
});
