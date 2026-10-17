import type { BlogDailyViews } from "~/model/types";

/**
 * Date ranges for the ninoan.com stats page. The report functions take whole UTC
 * days as "YYYY-MM-DD", inclusive at both ends, because the visitor hash they
 * count is per UTC day.
 */
export type BlogStatsRange = { fromDay: string; toDay: string };

export const RANGE_OPTIONS = [7, 30, 90, 365] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

/** The first UTC day the blog's log shipper recorded page views. */
export const RECORDING_STARTED = "2026-10-17";

/** How many pages and referring sites the report functions return. */
export const BLOG_TOP_ROWS = 25;

const DAY_MS = 24 * 60 * 60 * 1000;

export function utcDay(date: Date): string {
   return date.toISOString().slice(0, 10);
}

/**
 * The last `days` UTC days up to and including `today`, but not reaching back
 * before recording started: those days would only add empty bars and drag the
 * averages down.
 */
export function rangeEndingOn(today: string, days: number): BlogStatsRange {
   const from = utcDay(new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * DAY_MS));
   // ISO dates compare correctly as strings.
   const earliest = RECORDING_STARTED < today ? RECORDING_STARTED : today;
   return { fromDay: from < earliest ? earliest : from, toDay: today };
}

export type BlogStatsSummary = {
   views: number;
   /** Distinct visitors per day, averaged over the range's complete days. */
   averageDailyVisitors: number;
};

export function summarise(
   daily: Array<BlogDailyViews>,
   today: string,
): BlogStatsSummary {
   const views = daily.reduce((sum, day) => sum + day.views, 0);
   // Today isn't over yet, so it would pull the average down. Leave it out,
   // unless it's the only day there is.
   const complete = daily.filter((day) => day.day !== today);
   const counted = complete.length > 0 ? complete : daily;
   const visitors = counted.reduce((sum, day) => sum + day.visitors, 0);
   return {
      views,
      averageDailyVisitors: counted.length === 0 ? 0 : visitors / counted.length,
   };
}

/** "17 Oct", or "17 Oct 2026" with `withYear`. The day is a UTC date. */
export function formatDay(day: string, { withYear = false } = {}): string {
   return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
   });
}
