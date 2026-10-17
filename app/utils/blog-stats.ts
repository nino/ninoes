import type { BlogDailyViews } from "~/model/types";

/**
 * Date ranges for the ninoan.com stats page. The report functions take whole UTC
 * days as "YYYY-MM-DD", inclusive at both ends, because the visitor hash they
 * count is per UTC day.
 */
export type BlogStatsRange = { fromDay: string; toDay: string };

export const RANGE_OPTIONS = [7, 30, 90, 365] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(date: Date): string {
   return date.toISOString().slice(0, 10);
}

/** The last `days` UTC days, ending with today. */
export function rangeEndingToday(days: number, now: Date = new Date()): BlogStatsRange {
   return {
      fromDay: utcDay(new Date(now.getTime() - (days - 1) * DAY_MS)),
      toDay: utcDay(now),
   };
}

export type BlogStatsSummary = {
   views: number;
   /** Distinct visitors per day, averaged over the range. */
   averageDailyVisitors: number;
};

export function summarise(daily: Array<BlogDailyViews>): BlogStatsSummary {
   const views = daily.reduce((sum, day) => sum + day.views, 0);
   const visitors = daily.reduce((sum, day) => sum + day.visitors, 0);
   return {
      views,
      averageDailyVisitors: daily.length === 0 ? 0 : visitors / daily.length,
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
