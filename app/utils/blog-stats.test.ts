import { describe, expect, it } from "vitest";
import { formatDay, rangeEndingToday, summarise } from "./blog-stats";

describe("rangeEndingToday", () => {
   it("covers the given number of days, including today", () => {
      expect(rangeEndingToday(7, new Date("2026-10-17T12:00:00Z"))).toEqual({
         fromDay: "2026-10-11",
         toDay: "2026-10-17",
      });
   });

   it("is just today for one day", () => {
      expect(rangeEndingToday(1, new Date("2026-10-17T12:00:00Z"))).toEqual({
         fromDay: "2026-10-17",
         toDay: "2026-10-17",
      });
   });

   it("uses the UTC date, not the local one", () => {
      // 00:30 in London on the 18th, but still the 17th in UTC.
      expect(rangeEndingToday(1, new Date("2026-10-17T23:30:00Z")).toDay).toBe(
         "2026-10-17",
      );
   });

   it("crosses month and year boundaries", () => {
      expect(rangeEndingToday(30, new Date("2026-01-10T08:00:00Z"))).toEqual({
         fromDay: "2025-12-12",
         toDay: "2026-01-10",
      });
   });
});

describe("summarise", () => {
   it("adds up views and averages daily visitors, counting empty days", () => {
      expect(
         summarise([
            { day: "2026-10-15", views: 10, visitors: 4 },
            { day: "2026-10-16", views: 0, visitors: 0 },
            { day: "2026-10-17", views: 5, visitors: 2 },
         ]),
      ).toEqual({ views: 15, averageDailyVisitors: 2 });
   });

   it("is zero for no days", () => {
      expect(summarise([])).toEqual({ views: 0, averageDailyVisitors: 0 });
   });
});

describe("formatDay", () => {
   it("formats a UTC date without the year by default", () => {
      expect(formatDay("2026-10-17")).toBe("17 Oct");
   });

   it("includes the year when asked", () => {
      expect(formatDay("2026-10-17", { withYear: true })).toBe("17 Oct 2026");
   });

   it("doesn't shift the day in time zones west of UTC", () => {
      expect(formatDay("2026-01-01")).toBe("1 Jan");
   });
});
