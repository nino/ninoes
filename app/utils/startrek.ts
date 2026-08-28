/**
 * Star Trek: The Original Series, on a 60-years-delayed schedule — every
 * episode "airs" on the 60th anniversary of its original NBC broadcast.
 */

/** How far behind the original 1966–69 run we are watching. */
export const delayYears = 60;

/**
 * The calendar the schedule is read against. Pinning it keeps "today" the same
 * on the server and in the browser, so the server-rendered page and the
 * hydrated one never disagree about what has aired.
 */
export const scheduleTimeZone = "Europe/London";

export interface Episode {
   season: number;
   /** Position within the season, 1-based. */
   episode: number;
   title: string;
   /** Original NBC broadcast date, as a plain calendar date (`YYYY-MM-DD`). */
   originalAirDate: string;
}

/**
 * Original US broadcast dates, in order, grouped by season. NBC skipped weeks
 * fairly often, so the gaps between episodes are uneven on purpose.
 */
const seasons: Array<Array<[originalAirDate: string, title: string]>> = [
   [
      ["1966-09-08", "The Man Trap"],
      ["1966-09-15", "Charlie X"],
      ["1966-09-22", "Where No Man Has Gone Before"],
      ["1966-09-29", "The Naked Time"],
      ["1966-10-06", "The Enemy Within"],
      ["1966-10-13", "Mudd's Women"],
      ["1966-10-20", "What Are Little Girls Made Of?"],
      ["1966-10-27", "Miri"],
      ["1966-11-03", "Dagger of the Mind"],
      ["1966-11-10", "The Corbomite Maneuver"],
      ["1966-11-17", "The Menagerie, Part I"],
      ["1966-11-24", "The Menagerie, Part II"],
      ["1966-12-08", "The Conscience of the King"],
      ["1966-12-15", "Balance of Terror"],
      ["1966-12-29", "Shore Leave"],
      ["1967-01-05", "The Galileo Seven"],
      ["1967-01-12", "The Squire of Gothos"],
      ["1967-01-19", "Arena"],
      ["1967-01-26", "Tomorrow Is Yesterday"],
      ["1967-02-02", "Court Martial"],
      ["1967-02-09", "The Return of the Archons"],
      ["1967-02-16", "Space Seed"],
      ["1967-02-23", "A Taste of Armageddon"],
      ["1967-03-02", "This Side of Paradise"],
      ["1967-03-09", "The Devil in the Dark"],
      ["1967-03-23", "Errand of Mercy"],
      ["1967-03-30", "The Alternative Factor"],
      ["1967-04-06", "The City on the Edge of Forever"],
      ["1967-04-13", "Operation — Annihilate!"],
   ],
   [
      ["1967-09-15", "Amok Time"],
      ["1967-09-22", "Who Mourns for Adonais?"],
      ["1967-09-29", "The Changeling"],
      ["1967-10-06", "Mirror, Mirror"],
      ["1967-10-13", "The Apple"],
      ["1967-10-20", "The Doomsday Machine"],
      ["1967-10-27", "Catspaw"],
      ["1967-11-03", "I, Mudd"],
      ["1967-11-10", "Metamorphosis"],
      ["1967-11-17", "Journey to Babel"],
      ["1967-12-01", "Friday's Child"],
      ["1967-12-08", "The Deadly Years"],
      ["1967-12-15", "Obsession"],
      ["1967-12-22", "Wolf in the Fold"],
      ["1967-12-29", "The Trouble with Tribbles"],
      ["1968-01-05", "The Gamesters of Triskelion"],
      ["1968-01-12", "A Piece of the Action"],
      ["1968-01-19", "The Immunity Syndrome"],
      ["1968-02-02", "A Private Little War"],
      ["1968-02-09", "Return to Tomorrow"],
      ["1968-02-16", "Patterns of Force"],
      ["1968-02-23", "By Any Other Name"],
      ["1968-03-01", "The Omega Glory"],
      ["1968-03-08", "The Ultimate Computer"],
      ["1968-03-15", "Bread and Circuses"],
      ["1968-03-29", "Assignment: Earth"],
   ],
   [
      ["1968-09-20", "Spock's Brain"],
      ["1968-09-27", "The Enterprise Incident"],
      ["1968-10-04", "The Paradise Syndrome"],
      ["1968-10-11", "And the Children Shall Lead"],
      ["1968-10-18", "Is There in Truth No Beauty?"],
      ["1968-10-25", "Spectre of the Gun"],
      ["1968-11-01", "Day of the Dove"],
      ["1968-11-08", "For the World Is Hollow and I Have Touched the Sky"],
      ["1968-11-15", "The Tholian Web"],
      ["1968-11-22", "Plato's Stepchildren"],
      ["1968-11-29", "Wink of an Eye"],
      ["1968-12-06", "The Empath"],
      ["1968-12-20", "Elaan of Troyius"],
      ["1969-01-03", "Whom Gods Destroy"],
      ["1969-01-10", "Let That Be Your Last Battlefield"],
      ["1969-01-17", "The Mark of Gideon"],
      ["1969-01-24", "That Which Survives"],
      ["1969-01-31", "The Lights of Zetar"],
      ["1969-02-14", "Requiem for Methuselah"],
      ["1969-02-21", "The Way to Eden"],
      ["1969-02-28", "The Cloud Minders"],
      ["1969-03-07", "The Savage Curtain"],
      ["1969-03-14", "All Our Yesterdays"],
      ["1969-06-03", "Turnabout Intruder"],
   ],
];

/** All 79 episodes, in original broadcast order. */
export const episodes: Array<Episode> = seasons.flatMap((season, seasonIndex) =>
   season.map(([originalAirDate, title], episodeIndex): Episode => ({
      season: seasonIndex + 1,
      episode: episodeIndex + 1,
      title,
      originalAirDate,
   })),
);

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
 * with `delayYears` added to the year. Done on the string so the calendar date
 * survives exactly, with no timezone involved.
 */
export function delayedAirDate(originalAirDate: string): string {
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
   /** The original air date shifted by `delayYears` (`YYYY-MM-DD`). */
   airDate: string;
   hasAired: boolean;
   /** Days until it airs: 0 today, negative once it is out. */
   daysUntilAir: number;
}

export interface Schedule {
   today: string;
   episodes: Array<ScheduledEpisode>;
   airedCount: number;
   /** The most recently aired episode, or null before the premiere. */
   latest: ScheduledEpisode | null;
   /** The next episode still to air, or null once the run is over. */
   next: ScheduledEpisode | null;
}

/**
 * Places every episode against `today` (a `YYYY-MM-DD` calendar date). An
 * episode airing today counts as aired.
 */
export function buildSchedule(today: string): Schedule {
   const scheduled = episodes.map((episode): ScheduledEpisode => {
      const airDate = delayedAirDate(episode.originalAirDate);
      const daysUntilAir = daysBetween(today, airDate);
      return { ...episode, airDate, daysUntilAir, hasAired: daysUntilAir <= 0 };
   });

   // The list is in broadcast order, so the last aired one is the newest and
   // the first unaired one is next up.
   const aired = scheduled.filter((episode) => episode.hasAired);
   return {
      today,
      episodes: scheduled,
      airedCount: aired.length,
      latest: aired.at(-1) ?? null,
      next: scheduled.find((episode) => !episode.hasAired) ?? null,
   };
}

export interface SeasonGroup {
   season: number;
   episodes: Array<ScheduledEpisode>;
   airedCount: number;
}

/** Regroups a flat schedule into its seasons, keeping broadcast order. */
export function groupBySeason(scheduled: Array<ScheduledEpisode>): Array<SeasonGroup> {
   const groups: Array<SeasonGroup> = [];
   for (const episode of scheduled) {
      const group = groups.at(-1);
      if (group?.season === episode.season) {
         group.episodes.push(episode);
         if (episode.hasAired) group.airedCount += 1;
      } else {
         groups.push({
            season: episode.season,
            episodes: [episode],
            airedCount: episode.hasAired ? 1 : 0,
         });
      }
   }
   return groups;
}
