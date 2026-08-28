/**
 * Star Trek on a delayed schedule — every episode "airs" on the anniversary of
 * its original broadcast, a fixed number of years delayed. The Original Series
 * is 60 years delayed; everything from The Next Generation on is 45 years
 * delayed, which keeps the later shows overlapping exactly as they first did.
 */
import { type SeriesData, seriesData } from "./startrek-data";

/**
 * The calendar the schedule is read against. Pinning it keeps "today" the same
 * on the server and in the browser, so the server-rendered page and the
 * hydrated one never disagree about what has aired.
 */
export const scheduleTimeZone = "Europe/London";

export interface Episode {
   /** Stable identity, unique across every series. */
   key: string;
   seriesId: string;
   season: number;
   /** First episode slot this broadcast filled, 1-based within the season. */
   episode: number;
   /** Last slot filled — the same as `episode` unless it was double-length. */
   episodeEnd: number;
   title: string;
   /** Original broadcast date, as a plain calendar date (`YYYY-MM-DD`). */
   originalAirDate: string;
}

export interface Series {
   id: string;
   shortName: string;
   name: string;
   fullName: string;
   delayYears: number;
   episodes: Array<Episode>;
   /** Episode slots, so a feature-length broadcast counts as two. */
   episodeCount: number;
   /** Years of the original run, e.g. "1966–69". */
   originalRunYears: string;
}

/**
 * "1966–69" for a run inside one century, "1995–2001" across one, and just
 * "1989" when it sits inside a single year.
 */
function runYears(firstDate: string, lastDate: string): string {
   const first = firstDate.slice(0, 4);
   const last = lastDate.slice(0, 4);
   if (first === last) return first;
   return `${first}–${first.slice(0, 2) === last.slice(0, 2) ? last.slice(2) : last}`;
}

function buildSeries(data: SeriesData): Series {
   const episodes = data.seasons.flatMap((season, seasonIndex) => {
      let slot = 1;
      return season.map(([originalAirDate, title, episodeSlots = 1]): Episode => {
         const episode = slot;
         slot += episodeSlots;
         return {
            key: `${data.id}-${seasonIndex + 1}-${episode}`,
            seriesId: data.id,
            season: seasonIndex + 1,
            episode,
            episodeEnd: slot - 1,
            title,
            originalAirDate,
         };
      });
   });

   return {
      id: data.id,
      shortName: data.shortName,
      name: data.name,
      fullName: data.fullName,
      delayYears: data.delayYears,
      episodes,
      episodeCount: episodes.reduce(
         (total, episode) => total + episodeSlots(episode),
         0,
      ),
      originalRunYears: runYears(
         episodes[0].originalAirDate,
         episodes[episodes.length - 1].originalAirDate,
      ),
   };
}

/** How many episode slots one broadcast filled. */
export function episodeSlots(episode: Episode): number {
   return episode.episodeEnd - episode.episode + 1;
}

export const allSeries: Array<Series> = seriesData.map(buildSeries);

/** Looks a series up by id, or null when the id is unknown or missing. */
export function findSeries(id: string | null): Series | null {
   return allSeries.find((series) => series.id === id) ?? null;
}

const msPerDay = 86_400_000;

function toUtcMs(date: string): number {
   const [year, month, day] = date.split("-").map(Number);
   return Date.UTC(year, month - 1, day);
}

/**
 * Whole days from `from` to `to`, negative when `to` is the earlier date. Both
 * are read as UTC midnights, so daylight saving never shifts the count.
 */
export function daysBetween(from: string, to: string): number {
   return (toUtcMs(to) - toUtcMs(from)) / msPerDay;
}

/**
 * The date an episode airs on the delayed schedule: the original broadcast date
 * with the series' delay added to the year. Done on the string so the calendar
 * date survives exactly, with no timezone involved.
 */
export function delayedAirDate(originalAirDate: string, delayYears: number): string {
   const year = Number(originalAirDate.slice(0, 4));
   return `${year + delayYears}${originalAirDate.slice(4)}`;
}

/** Today's calendar date in `scheduleTimeZone`, as `YYYY-MM-DD`. */
export function todayOnSchedule(now: Date = new Date()): string {
   const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: scheduleTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
   }).formatToParts(now);
   const part = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((candidate) => candidate.type === type)?.value ?? "";
   return `${part("year")}-${part("month")}-${part("day")}`;
}

export interface ScheduledEpisode extends Episode {
   seriesShortName: string;
   seriesName: string;
   /** The original air date shifted by the series' delay (`YYYY-MM-DD`). */
   airDate: string;
   hasAired: boolean;
   /** Days until it airs: 0 today, negative once it is out. */
   daysUntilAir: number;
}

/** Where a series has got to on the delayed schedule. */
export type SeriesStatus = "upcoming" | "running" | "finished";

export interface SeriesSummary {
   id: string;
   shortName: string;
   name: string;
   fullName: string;
   delayYears: number;
   originalRunYears: string;
   airedCount: number;
   episodeCount: number;
   status: SeriesStatus;
   /** The most recently aired episode, or null before the premiere. */
   latest: ScheduledEpisode | null;
   /** The next episode still to air, or null once the run is over. */
   next: ScheduledEpisode | null;
}

export interface Schedule extends SeriesSummary {
   today: string;
   episodes: Array<ScheduledEpisode>;
}

function schedule(series: Series, today: string): Array<ScheduledEpisode> {
   return series.episodes.map((episode): ScheduledEpisode => {
      const airDate = delayedAirDate(episode.originalAirDate, series.delayYears);
      const daysUntilAir = daysBetween(today, airDate);
      return {
         ...episode,
         seriesShortName: series.shortName,
         seriesName: series.name,
         airDate,
         daysUntilAir,
         hasAired: daysUntilAir <= 0,
      };
   });
}

function summarise(series: Series, scheduled: Array<ScheduledEpisode>): SeriesSummary {
   // The list is in broadcast order, so the last aired one is the newest and
   // the first unaired one is next up.
   const aired = scheduled.filter((episode) => episode.hasAired);
   const latest = aired.at(-1) ?? null;
   const next = scheduled.find((episode) => !episode.hasAired) ?? null;
   return {
      id: series.id,
      shortName: series.shortName,
      name: series.name,
      fullName: series.fullName,
      delayYears: series.delayYears,
      originalRunYears: series.originalRunYears,
      airedCount: aired.reduce((total, episode) => total + episodeSlots(episode), 0),
      episodeCount: series.episodeCount,
      status: latest === null ? "upcoming" : next === null ? "finished" : "running",
      latest,
      next,
   };
}

/**
 * Places every episode of `series` against `today` (a `YYYY-MM-DD` calendar
 * date). An episode airing today counts as aired.
 */
export function buildSchedule(series: Series, today: string): Schedule {
   const scheduled = schedule(series, today);
   return { ...summarise(series, scheduled), today, episodes: scheduled };
}

export interface FreshView {
   today: string;
   /** Every series' progress, in display order. */
   series: Array<SeriesSummary>;
   /** Episodes already out across all series, newest first. */
   recent: Array<ScheduledEpisode>;
   /** Episodes still to come across all series, soonest first. */
   upcoming: Array<ScheduledEpisode>;
}

/**
 * The cross-series view: what has just landed and what is due next, merged into
 * one timeline. With the later shows overlapping, this is the "what can we
 * watch tonight" answer that no single series page gives.
 */
export function buildFreshView(today: string, limit = 12): FreshView {
   const scheduled = allSeries.map((series, seriesIndex) => ({
      series,
      seriesIndex,
      episodes: schedule(series, today),
   }));

   // Broadcast order across every series: by date, then by series, then by
   // position — so the second half of a double bill sorts after the first.
   const order = new Map(scheduled.map((entry) => [entry.series.id, entry.seriesIndex]));
   const inAirOrder = (a: ScheduledEpisode, b: ScheduledEpisode): number => {
      if (a.airDate !== b.airDate) return a.airDate < b.airDate ? -1 : 1;
      const seriesGap = (order.get(a.seriesId) ?? 0) - (order.get(b.seriesId) ?? 0);
      if (seriesGap !== 0) return seriesGap;
      if (a.season !== b.season) return a.season - b.season;
      return a.episode - b.episode;
   };

   const all = scheduled.flatMap((entry) => entry.episodes);
   return {
      today,
      series: scheduled.map((entry) => summarise(entry.series, entry.episodes)),
      recent: all
         .filter((episode) => episode.hasAired)
         .toSorted(inAirOrder)
         .toReversed()
         .slice(0, limit),
      upcoming: all
         .filter((episode) => !episode.hasAired)
         .toSorted(inAirOrder)
         .slice(0, limit),
   };
}

export interface SeasonGroup {
   season: number;
   episodes: Array<ScheduledEpisode>;
   airedCount: number;
   episodeCount: number;
   /** Years of the season's original run, e.g. "1966–67". */
   originalRunYears: string;
}

/** Regroups a flat schedule into its seasons, keeping broadcast order. */
export function groupBySeason(scheduled: Array<ScheduledEpisode>): Array<SeasonGroup> {
   const groups: Array<SeasonGroup> = [];
   for (const episode of scheduled) {
      const slots = episodeSlots(episode);
      const group = groups.at(-1);
      if (group?.season === episode.season) {
         group.episodes.push(episode);
         group.episodeCount += slots;
         if (episode.hasAired) group.airedCount += slots;
      } else {
         groups.push({
            season: episode.season,
            episodes: [episode],
            episodeCount: slots,
            airedCount: episode.hasAired ? slots : 0,
            originalRunYears: "",
         });
      }
   }
   for (const group of groups) {
      group.originalRunYears = runYears(
         group.episodes[0].originalAirDate,
         group.episodes[group.episodes.length - 1].originalAirDate,
      );
   }
   return groups;
}

/** "S1E01", or "S1E01–02" for a broadcast that filled two slots. */
export function episodeCode(episode: Episode): string {
   const start = String(episode.episode).padStart(2, "0");
   if (episode.episodeEnd === episode.episode) return `S${episode.season}E${start}`;
   return `S${episode.season}E${start}–${String(episode.episodeEnd).padStart(2, "0")}`;
}
