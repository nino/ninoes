import React, { type JSX } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { useInterval } from "~/hooks/useInterval";
import {
   buildSchedule,
   delayYears,
   groupBySeason,
   type Schedule,
   type ScheduledEpisode,
   type SeasonGroup,
   todayOnSchedule,
} from "~/utils/startrek";
import type { Route } from "./+types/startrek";

export function meta({}: Route.MetaArgs): ReturnType<Route.MetaFunction> {
   return [
      { title: "Star Trek in real time" },
      {
         name: "description",
         content: `Star Trek: The Original Series, ${delayYears} years late — which episodes are out so far.`,
      },
   ];
}

// The page only changes when the date does, but an hourly refresh means a tab
// left open overnight rolls over on its own.
const refreshIntervalMs = 60 * 60 * 1000;

// Locales are pinned so the server and the browser format dates identically and
// hydration stays quiet. The dates are UTC midnights (see `utils/startrek`).
const airDateFormat = new Intl.DateTimeFormat("en-GB", {
   weekday: "short",
   day: "numeric",
   month: "short",
   year: "numeric",
   timeZone: "UTC",
});

const originalDateFormat = new Intl.DateTimeFormat("en-GB", {
   day: "numeric",
   month: "short",
   year: "numeric",
   timeZone: "UTC",
});

const relativeFormat = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

function formatDate(format: Intl.DateTimeFormat, date: string): string {
   return format.format(new Date(`${date}T00:00:00Z`));
}

/** "tomorrow", "3 days ago", "in 2 months" — coarser as the gap grows. */
function formatGap(daysUntilAir: number): string {
   const days = Math.abs(daysUntilAir);
   if (days < 14) return relativeFormat.format(daysUntilAir, "day");
   if (days < 60) return relativeFormat.format(Math.round(daysUntilAir / 7), "week");
   if (days < 365)
      return relativeFormat.format(Math.round(daysUntilAir / 30.44), "month");
   return relativeFormat.format(Math.round(daysUntilAir / 365.25), "year");
}

/** The season's original NBC run, e.g. "1966–67". */
function originalRunYears(group: SeasonGroup): string {
   const first = group.episodes[0].originalAirDate;
   const last = group.episodes[group.episodes.length - 1].originalAirDate;
   return `${first.slice(0, 4)}–${last.slice(2, 4)}`;
}

function episodeCode(episode: ScheduledEpisode): string {
   return `S${episode.season}E${String(episode.episode).padStart(2, "0")}`;
}

export const loader = (): { schedule: Schedule } => ({
   schedule: buildSchedule(todayOnSchedule()),
});

function ProgressBar({ value, max }: { value: number; max: number }): JSX.Element {
   return (
      <div
         className="mt-3 h-3 overflow-hidden rounded-full border border-gray-400/70 bg-white/70 shadow-inner"
         role="progressbar"
         aria-valuenow={value}
         aria-valuemin={0}
         aria-valuemax={max}
         aria-label={`${value} of ${max} episodes aired`}
      >
         <div
            className="h-full bg-gradient-to-b from-[#9dc0f4] to-[#2f6fd0]"
            style={{ width: `${(value / max) * 100}%` }}
         />
      </div>
   );
}

function HeroSlot({
   label,
   episode,
   emptyMessage,
}: {
   label: string;
   episode: ScheduledEpisode | null;
   emptyMessage: string;
}): JSX.Element {
   return (
      <div className="rounded-md border border-gray-300 bg-white/60 p-3">
         <h2 className="text-[11px] font-bold tracking-wide text-gray-500 uppercase">
            {label}
         </h2>
         {episode == null ? (
            <p className="mt-1 text-gray-600">{emptyMessage}</p>
         ) : (
            <>
               <p className="mt-1 leading-tight font-semibold">{episode.title}</p>
               <p className="mt-1 text-gray-600">
                  <span className="tabular-nums">{episodeCode(episode)}</span> ·{" "}
                  {formatDate(airDateFormat, episode.airDate)}
               </p>
               <p className="mt-0.5 font-medium text-[#2f6fd0]">
                  {formatGap(episode.daysUntilAir)}
               </p>
            </>
         )}
      </div>
   );
}

function EpisodeRow({
   episode,
   isLatest,
   isNext,
}: {
   episode: ScheduledEpisode;
   isLatest: boolean;
   isNext: boolean;
}): JSX.Element {
   const highlight = isLatest
      ? "bg-[#dbe8fb]"
      : isNext
        ? "bg-white ring-1 ring-inset ring-[#2f6fd0]/40"
        : "";

   return (
      <li
         className={`col-span-full grid grid-cols-subgrid items-baseline gap-x-3 rounded border-b border-gray-200 px-2 py-1.5 last:border-b-0 ${highlight} ${
            episode.hasAired ? "" : "text-gray-500"
         }`}
      >
         <span className="flex items-baseline gap-1.5 tabular-nums">
            <span
               className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                  episode.hasAired
                     ? "bg-[#2f6fd0]"
                     : "border border-gray-400 bg-transparent"
               }`}
               aria-hidden="true"
            />
            <span className="text-xs">{episodeCode(episode)}</span>
         </span>

         <span>
            <span className={episode.hasAired ? "font-medium" : ""}>
               {episode.title}
            </span>
            {isLatest && (
               <span className="ml-2 rounded bg-[#2f6fd0] px-1.5 py-px text-[10px] font-bold tracking-wide text-white uppercase">
                  Latest
               </span>
            )}
            {isNext && (
               <span className="ml-2 rounded border border-[#2f6fd0]/50 px-1.5 py-px text-[10px] font-bold tracking-wide text-[#2f6fd0] uppercase">
                  Next
               </span>
            )}
            <span className="block text-xs text-gray-500">
               originally {formatDate(originalDateFormat, episode.originalAirDate)}
               <span className="sr-only">
                  {episode.hasAired ? " — already aired" : " — not out yet"}
               </span>
            </span>
         </span>

         {/* The dates sit beside the title on wide screens and drop onto their
             own line beneath it on narrow ones, so titles aren't squeezed. */}
         <span className="col-start-2 flex flex-row items-baseline gap-x-2 sm:col-start-3 sm:flex-col sm:items-end sm:gap-x-0">
            <span className="whitespace-nowrap tabular-nums">
               {formatDate(airDateFormat, episode.airDate)}
            </span>
            <span className="text-xs whitespace-nowrap text-gray-500">
               {formatGap(episode.daysUntilAir)}
            </span>
         </span>
      </li>
   );
}

export default function StarTrek(): JSX.Element {
   const { schedule } = useLoaderData<typeof loader>();
   const { revalidate } = useRevalidator();

   useInterval(() => void revalidate(), refreshIntervalMs);

   const seasons = React.useMemo(
      () => groupBySeason(schedule.episodes),
      [schedule.episodes],
   );
   const total = schedule.episodes.length;

   return (
      <div className="space-y-8">
         <header className="space-y-2">
            <h1 className="text-2xl font-bold">Star Trek, {delayYears} years late</h1>
            <p className="max-w-2xl text-gray-600">
               The Original Series as it went out on NBC between 1966 and 1969, shifted
               forward by exactly {delayYears} years. An episode counts as out once its{" "}
               {delayYears}th anniversary has come round.
            </p>
         </header>

         <div className="aqua-panel p-4 sm:p-5">
            <p className="flex flex-wrap items-baseline gap-x-2">
               <span className="text-3xl font-bold tabular-nums">
                  {schedule.airedCount}
               </span>
               <span className="text-gray-600">of {total} episodes are out</span>
            </p>
            <ProgressBar value={schedule.airedCount} max={total} />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
               <HeroSlot
                  label="Latest episode"
                  episode={schedule.latest}
                  emptyMessage="Nothing yet — the premiere is still ahead."
               />
               <HeroSlot
                  label="Next episode"
                  episode={schedule.next}
                  emptyMessage="That's the lot. Three seasons, all watched."
               />
            </div>
         </div>

         {seasons.map((group) => (
            <section key={group.season} className="space-y-2">
               <h2 className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-lg font-bold">Season {group.season}</span>
                  <span className="text-xs tabular-nums text-gray-500">
                     {originalRunYears(group)} · {group.episodes.length} episodes ·{" "}
                     {group.airedCount} out
                  </span>
               </h2>
               <ul className="grid grid-cols-[auto_1fr] gap-x-3 rounded-md border border-gray-300 bg-white/50 p-1 sm:grid-cols-[auto_1fr_auto]">
                  {group.episodes.map((episode) => (
                     <EpisodeRow
                        key={`${episode.season}-${episode.episode}`}
                        episode={episode}
                        isLatest={schedule.latest?.airDate === episode.airDate}
                        isNext={schedule.next?.airDate === episode.airDate}
                     />
                  ))}
               </ul>
            </section>
         ))}
      </div>
   );
}
