import { expect, test } from "vitest";
import {
   allSeries,
   buildFreshView,
   buildSchedule,
   daysBetween,
   delayedAirDate,
   episodeCode,
   episodeSlots,
   findSeries,
   groupBySeason,
   type Series,
   todayOnSchedule,
} from "./startrek";

function series(id: string): Series {
   const found = findSeries(id);
   if (found === null) throw new Error(`no such series: ${id}`);
   return found;
}

const tos = series("tos");
const tng = series("tng");
const ds9 = series("ds9");
const voy = series("voy");
const ent = series("ent");

test("tracks five series with their delays", () => {
   expect(allSeries.map((s) => s.id)).toStrictEqual(["tos", "tng", "ds9", "voy", "ent"]);
   expect(allSeries.map((s) => s.delayYears)).toStrictEqual([60, 45, 45, 45, 45]);
   expect(allSeries.map((s) => s.shortName)).toStrictEqual([
      "TOS",
      "TNG",
      "DS9",
      "VOY",
      "ENT",
   ]);
});

test("holds the canonical episode count for each series", () => {
   expect(tos.episodeCount).toBe(79);
   expect(tng.episodeCount).toBe(178);
   expect(ds9.episodeCount).toBe(176);
   expect(voy.episodeCount).toBe(172);
   expect(ent.episodeCount).toBe(98);
   // 703 episodes over 692 broadcasts — the difference is the feature-length ones.
   expect(allSeries.reduce((n, s) => n + s.episodeCount, 0)).toBe(703);
   expect(allSeries.reduce((n, s) => n + s.episodes.length, 0)).toBe(692);
});

test("counts the expected episodes per season", () => {
   const perSeason = (s: Series): Array<number> =>
      groupBySeason(buildSchedule(s, "2026-08-28").episodes).map(
         (group) => group.episodeCount,
      );
   expect(perSeason(tos)).toStrictEqual([29, 26, 24]);
   expect(perSeason(tng)).toStrictEqual([26, 22, 26, 26, 26, 26, 26]);
   expect(perSeason(ds9)).toStrictEqual([20, 26, 26, 26, 26, 26, 26]);
   expect(perSeason(voy)).toStrictEqual([16, 26, 26, 26, 26, 26, 26]);
   expect(perSeason(ent)).toStrictEqual([26, 26, 24, 22]);
});

test("opens and closes each series on its known dates", () => {
   const bounds = (s: Series): Array<string> => [
      s.episodes[0].originalAirDate,
      s.episodes[s.episodes.length - 1].originalAirDate,
   ];
   expect(bounds(tos)).toStrictEqual(["1966-09-08", "1969-06-03"]);
   expect(bounds(tng)).toStrictEqual(["1987-09-28", "1994-05-23"]);
   expect(bounds(ds9)).toStrictEqual(["1993-01-03", "1999-06-02"]);
   expect(bounds(voy)).toStrictEqual(["1995-01-16", "2001-05-23"]);
   expect(bounds(ent)).toStrictEqual(["2001-09-26", "2005-05-13"]);
});

test("keeps every series in date order with unique episode keys", () => {
   const keys = new Set<string>();
   for (const s of allSeries) {
      const dates = s.episodes.map((episode) => episode.originalAirDate);
      expect(dates).toStrictEqual(dates.toSorted());
      for (const episode of s.episodes) keys.add(episode.key);
   }
   expect(keys.size).toBe(692);
});

test("numbers seasons contiguously from 1, allowing for double episodes", () => {
   for (const s of allSeries) {
      for (const group of groupBySeason(buildSchedule(s, "2026-08-28").episodes)) {
         let expected = 1;
         for (const episode of group.episodes) {
            expect(episode.episode).toBe(expected);
            expect(episodeSlots(episode)).toBeGreaterThanOrEqual(1);
            expected = episode.episodeEnd + 1;
         }
      }
   }
});

test("returns null for an unknown or missing series id", () => {
   expect(findSeries(null)).toBeNull();
   expect(findSeries("disco")).toBeNull();
});

test("shifts an air date by the delay without moving the day of the month", () => {
   expect(delayedAirDate("1966-09-08", 60)).toBe("2026-09-08");
   expect(delayedAirDate("1987-09-28", 45)).toBe("2032-09-28");
   expect(delayedAirDate("1993-01-03", 45)).toBe("2038-01-03");
   expect(delayedAirDate("1995-01-16", 45)).toBe("2040-01-16");
   expect(delayedAirDate("2001-09-26", 45)).toBe("2046-09-26");
});

test("counts whole days between calendar dates, across a DST change", () => {
   expect(daysBetween("2026-08-28", "2026-09-08")).toBe(11);
   expect(daysBetween("2026-09-08", "2026-08-28")).toBe(-11);
   expect(daysBetween("2026-08-28", "2026-08-28")).toBe(0);
   // British Summer Time ends on 2026-10-25.
   expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
});

test("labels an episode with its slot, or its span when double-length", () => {
   expect(episodeCode(tos.episodes[0])).toBe("S1E01");
   expect(episodeCode(tng.episodes[0])).toBe("S1E01–02");
   expect(episodeCode(ds9.episodes[0])).toBe("S1E01–02");
   expect(episodeCode(voy.episodes[0])).toBe("S1E01–02");
   expect(episodeCode(ent.episodes[0])).toBe("S1E01–02");
});

test("counts a double-length premiere as two episodes", () => {
   const schedule = buildSchedule(tng, "2032-09-28");
   expect(schedule.airedCount).toBe(2);
   expect(schedule.latest).toMatchObject({ title: "Encounter at Farpoint" });
   expect(schedule.next).toMatchObject({ title: "The Naked Now" });
});

test("reports nothing aired before a delayed premiere", () => {
   const schedule = buildSchedule(tos, "2026-09-07");
   expect(schedule.airedCount).toBe(0);
   expect(schedule.status).toBe("upcoming");
   expect(schedule.latest).toBeNull();
   expect(schedule.next).toMatchObject({
      title: "The Man Trap",
      airDate: "2026-09-08",
      daysUntilAir: 1,
   });
});

test("counts an episode as aired on its own air date", () => {
   const schedule = buildSchedule(tos, "2026-09-08");
   expect(schedule.airedCount).toBe(1);
   expect(schedule.status).toBe("running");
   expect(schedule.latest).toMatchObject({ title: "The Man Trap", daysUntilAir: 0 });
   expect(schedule.next).toMatchObject({ title: "Charlie X", daysUntilAir: 7 });
});

test("has no next episode once a finale has aired", () => {
   const schedule = buildSchedule(tos, "2029-06-03");
   expect(schedule.airedCount).toBe(79);
   expect(schedule.status).toBe("finished");
   expect(schedule.latest).toMatchObject({ title: "Turnabout Intruder" });
   expect(schedule.next).toBeNull();
});

test("keeps the later series overlapping as they originally did", () => {
   // Mid-2040: TOS and TNG are done, DS9 and Voyager are both running weekly,
   // and Enterprise has not started.
   const fresh = buildFreshView("2040-06-01");
   const status = Object.fromEntries(fresh.series.map((s) => [s.id, s.status]));
   expect(status).toStrictEqual({
      tos: "finished",
      tng: "finished",
      ds9: "running",
      voy: "running",
      ent: "upcoming",
   });
});

test("merges recent and upcoming episodes across series, closest first", () => {
   const fresh = buildFreshView("2040-06-01", 6);
   expect(fresh.recent).toHaveLength(6);
   expect(fresh.upcoming).toHaveLength(6);

   // Newest first going back, soonest first going forward.
   const recentDates = fresh.recent.map((episode) => episode.airDate);
   expect(recentDates).toStrictEqual(recentDates.toSorted().toReversed());
   const upcomingDates = fresh.upcoming.map((episode) => episode.airDate);
   expect(upcomingDates).toStrictEqual(upcomingDates.toSorted());

   expect(fresh.recent.every((episode) => episode.hasAired)).toBe(true);
   expect(fresh.upcoming.every((episode) => !episode.hasAired)).toBe(true);

   // Both running shows appear in the mix, which is the point of the view.
   expect(new Set(fresh.recent.map((episode) => episode.seriesShortName))).toContain(
      "DS9",
   );
   expect(new Set(fresh.recent.map((episode) => episode.seriesShortName))).toContain(
      "VOY",
   );
});

test("has nothing fresh before the very first premiere", () => {
   const fresh = buildFreshView("2026-08-28");
   expect(fresh.recent).toHaveLength(0);
   expect(fresh.upcoming[0]).toMatchObject({
      title: "The Man Trap",
      seriesShortName: "TOS",
      airDate: "2026-09-08",
   });
   expect(fresh.series.every((s) => s.status === "upcoming")).toBe(true);
});

test("has nothing upcoming once every series has finished", () => {
   const fresh = buildFreshView("2050-05-13");
   expect(fresh.upcoming).toHaveLength(0);
   expect(fresh.series.every((s) => s.status === "finished")).toBe(true);
   expect(fresh.recent[0]).toMatchObject({
      title: "These Are the Voyages...",
      seriesShortName: "ENT",
   });
});

test("reads today in the schedule's timezone, not UTC", () => {
   // 00:30 on the 8th in London (BST) is still 23:30 on the 7th in UTC.
   expect(todayOnSchedule(new Date("2026-09-07T23:30:00Z"))).toBe("2026-09-08");
   expect(todayOnSchedule(new Date("2026-09-07T12:00:00Z"))).toBe("2026-09-07");
});

test("writes a run's years compactly, but not across a century", () => {
   expect(tos.originalRunYears).toBe("1966–69");
   expect(tng.originalRunYears).toBe("1987–94");
   expect(ds9.originalRunYears).toBe("1993–99");
   expect(voy.originalRunYears).toBe("1995–2001");
   expect(ent.originalRunYears).toBe("2001–05");
});
