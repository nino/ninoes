import { expect, test } from "vitest";
import {
   buildSchedule,
   daysBetween,
   delayedAirDate,
   delayYears,
   episodes,
   groupBySeason,
   todayOnSchedule,
} from "./startrek";

test("holds all 79 episodes in broadcast order", () => {
   expect(episodes).toHaveLength(79);
   expect(episodes.at(0)).toMatchObject({
      season: 1,
      episode: 1,
      title: "The Man Trap",
      originalAirDate: "1966-09-08",
   });
   expect(episodes.at(-1)).toMatchObject({
      season: 3,
      episode: 24,
      title: "Turnabout Intruder",
      originalAirDate: "1969-06-03",
   });

   const dates = episodes.map((episode) => episode.originalAirDate);
   expect(dates).toStrictEqual(dates.toSorted());
   expect(new Set(dates).size).toBe(dates.length);
});

test("numbers each season from 1 and counts 29 / 26 / 24", () => {
   const groups = groupBySeason(buildSchedule("2026-08-28").episodes);
   expect(groups.map((group) => group.episodes.length)).toStrictEqual([29, 26, 24]);
   for (const group of groups) {
      expect(group.episodes.map((episode) => episode.episode)).toStrictEqual(
         group.episodes.map((_, index) => index + 1),
      );
   }
});

test("shifts an air date by the delay without moving the day of the month", () => {
   expect(delayedAirDate("1966-09-08")).toBe("2026-09-08");
   expect(delayedAirDate("1969-06-03")).toBe("2029-06-03");
   expect(delayYears).toBe(60);
});

test("counts whole days between calendar dates, across a DST change", () => {
   expect(daysBetween("2026-08-28", "2026-09-08")).toBe(11);
   expect(daysBetween("2026-09-08", "2026-08-28")).toBe(-11);
   expect(daysBetween("2026-08-28", "2026-08-28")).toBe(0);
   // British Summer Time ends on 2026-10-25.
   expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
});

test("reports nothing aired before the delayed premiere", () => {
   const schedule = buildSchedule("2026-09-07");
   expect(schedule.airedCount).toBe(0);
   expect(schedule.latest).toBeNull();
   expect(schedule.next).toMatchObject({
      title: "The Man Trap",
      airDate: "2026-09-08",
      daysUntilAir: 1,
      hasAired: false,
   });
});

test("counts an episode as aired on its own air date", () => {
   const schedule = buildSchedule("2026-09-08");
   expect(schedule.airedCount).toBe(1);
   expect(schedule.latest).toMatchObject({ title: "The Man Trap", daysUntilAir: 0 });
   expect(schedule.next).toMatchObject({ title: "Charlie X", daysUntilAir: 7 });
});

test("tracks the latest and next episode part-way through the run", () => {
   // Between "The Naked Time" (2026-09-29) and "The Enemy Within" (2026-10-06).
   const schedule = buildSchedule("2026-10-01");
   expect(schedule.airedCount).toBe(4);
   expect(schedule.latest).toMatchObject({ title: "The Naked Time", daysUntilAir: -2 });
   expect(schedule.next).toMatchObject({ title: "The Enemy Within", daysUntilAir: 5 });
});

test("has no next episode once the finale has aired", () => {
   const schedule = buildSchedule("2029-06-03");
   expect(schedule.airedCount).toBe(79);
   expect(schedule.latest).toMatchObject({ title: "Turnabout Intruder" });
   expect(schedule.next).toBeNull();
});

test("reads today in the schedule's timezone, not UTC", () => {
   // 00:30 on the 8th in London (BST) is still 23:30 on the 7th in UTC.
   expect(todayOnSchedule(new Date("2026-09-07T23:30:00Z"))).toBe("2026-09-08");
   expect(todayOnSchedule(new Date("2026-09-07T12:00:00Z"))).toBe("2026-09-07");
});
