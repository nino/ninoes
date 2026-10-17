import { describe, expect, it } from "bun:test";
import {
   formatDay,
   rangeEndingOn,
   RECORDING_STARTED,
   summarise,
   utcDay,
} from "./blog-stats";

describe("utcDay", () => {
   it("uses the UTC date, not the local one", () => {
      // 00:30 in London on the 18th, but still the 17th in UTC.
      expect(utcDay(new Date("2027-10-17T23:30:00Z"))).toBe("2027-10-17");
   });
});

describe("rangeEndingOn", () => {
   it("covers the given number of days, including today", () => {
      expect(rangeEndingOn("2027-03-15", 7)).toEqual({
         fromDay: "2027-03-09",
         toDay: "2027-03-15",
      });
   });

   it("is just today for one day", () => {
      expect(rangeEndingOn("2027-03-15", 1)).toEqual({
         fromDay: "2027-03-15",
         toDay: "2027-03-15",
      });
   });

   it("crosses month and year boundaries", () => {
      expect(rangeEndingOn("2028-01-10", 30)).toEqual({
         fromDay: "2027-12-12",
         toDay: "2028-01-10",
      });
   });

   it("doesn't reach back before recording started", () => {
      expect(rangeEndingOn("2026-10-20", 30)).toEqual({
         fromDay: RECORDING_STARTED,
         toDay: "2026-10-20",
      });
      expect(rangeEndingOn(RECORDING_STARTED, 365)).toEqual({
         fromDay: RECORDING_STARTED,
         toDay: RECORDING_STARTED,
      });
   });

   it("is just today if the clock says recording hasn't started yet", () => {
      // There's no data then anyway, but the range must not start after it ends.
      expect(rangeEndingOn("2026-01-01", 7)).toEqual({
         fromDay: "2026-01-01",
         toDay: "2026-01-01",
      });
   });
});

describe("summarise", () => {
   const days = [
      { day: "2027-03-13", views: 10, visitors: 4 },
      { day: "2027-03-14", views: 0, visitors: 0 },
      { day: "2027-03-15", views: 5, visitors: 1 },
   ];

   it("adds up all views, and averages visitors over complete days", () => {
      // Today (the 15th) is left out of the average: (4 + 0) / 2.
      expect(summarise(days, "2027-03-15")).toEqual({
         views: 15,
         averageDailyVisitors: 2,
      });
   });

   it("averages over every day when today isn't in the range", () => {
      expect(summarise(days, "2027-03-20").averageDailyVisitors).toBeCloseTo(5 / 3);
   });

   it("uses today when it's the only day", () => {
      expect(
         summarise([{ day: "2027-03-15", views: 3, visitors: 2 }], "2027-03-15"),
      ).toEqual({ views: 3, averageDailyVisitors: 2 });
   });

   it("is zero for no days", () => {
      expect(summarise([], "2027-03-15")).toEqual({ views: 0, averageDailyVisitors: 0 });
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
