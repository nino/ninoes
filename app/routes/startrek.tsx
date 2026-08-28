import React, { type JSX } from "react";
import {
   Link,
   type LoaderFunctionArgs,
   useLoaderData,
   useRevalidator,
} from "react-router";
import { useInterval } from "~/hooks/useInterval";
import { externalOrigin } from "~/utils/request";
import {
   allSeries,
   buildFreshView,
   buildSchedule,
   episodeCode,
   findSeries,
   type FreshView,
   groupBySeason,
   type Schedule,
   type ScheduledEpisode,
   type SeasonGroup,
   type SeriesSummary,
   todayOnSchedule,
} from "~/utils/startrek";
import type { Route } from "./+types/startrek";

export function meta({}: Route.MetaArgs): ReturnType<Route.MetaFunction> {
   return [
      { title: "Star Trek in real time" },
      {
         name: "description",
         content:
            "Five Star Trek series on a delayed schedule — which episodes are out so far.",
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

interface SeriesTab {
   id: string;
   shortName: string;
   airedCount: number;
   episodeCount: number;
}

interface CalendarFeed {
   /** webcal:// address, which calendar apps treat as a subscription. */
   subscribeUrl: string;
   /** The same feed over https, for clients that want a plain URL. */
   downloadUrl: string;
}

/** The two shapes the page renders: the cross-series view, or one series. */
type LoaderData = { tabs: Array<SeriesTab>; feed: CalendarFeed } & (
   { view: "fresh"; fresh: FreshView } | { view: "series"; schedule: Schedule }
);

export const loader = ({ request }: LoaderFunctionArgs): LoaderData => {
   const today = todayOnSchedule();
   const url = new URL(request.url);
   const selected = findSeries(url.searchParams.get("series"));
   const query = selected === null ? "" : `?series=${selected.id}`;
   const { origin, host } = externalOrigin(request);
   const feed = {
      // webcal: makes calendar apps offer to subscribe rather than download.
      subscribeUrl: `webcal://${host}/startrek.ics${query}`,
      downloadUrl: `${origin}/startrek.ics${query}`,
   };
   const tabs = allSeries.map((series): SeriesTab => {
      const summary = buildSchedule(series, today);
      return {
         id: series.id,
         shortName: series.shortName,
         airedCount: summary.airedCount,
         episodeCount: summary.episodeCount,
      };
   });

   // No series selected (or an unknown one) means the cross-series view.
   return selected === null
      ? { tabs, feed, view: "fresh", fresh: buildFreshView(today) }
      : { tabs, feed, view: "series", schedule: buildSchedule(selected, today) };
};

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

function SeriesBadge({ shortName }: { shortName: string }): JSX.Element {
   return (
      <span className="inline-block min-w-[2.6rem] rounded bg-[#5b6470] px-1.5 py-px text-center text-[10px] font-bold tracking-wide text-white">
         {shortName}
      </span>
   );
}

function HeroSlot({
   label,
   episode,
   emptyMessage,
   showSeries = false,
}: {
   label: string;
   episode: ScheduledEpisode | null;
   emptyMessage: string;
   showSeries?: boolean;
}): JSX.Element {
   return (
      <div className="rounded-md border border-gray-300 bg-white/60 p-3">
         <h3 className="text-[11px] font-bold tracking-wide text-gray-500 uppercase">
            {label}
         </h3>
         {episode == null ? (
            <p className="mt-1 text-gray-600">{emptyMessage}</p>
         ) : (
            <>
               <p className="mt-1 flex items-baseline gap-2 leading-tight font-semibold">
                  {showSeries && <SeriesBadge shortName={episode.seriesShortName} />}
                  <span>{episode.title}</span>
               </p>
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
   showSeries = false,
}: {
   episode: ScheduledEpisode;
   isLatest: boolean;
   isNext: boolean;
   showSeries?: boolean;
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
            {showSeries && <SeriesBadge shortName={episode.seriesShortName} />}
            <span className="text-xs whitespace-nowrap">{episodeCode(episode)}</span>
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

function EpisodeList({
   episodes,
   showSeries = false,
   latestKey,
   nextKey,
}: {
   episodes: Array<ScheduledEpisode>;
   showSeries?: boolean;
   latestKey?: string;
   nextKey?: string;
}): JSX.Element {
   return (
      <ul className="grid grid-cols-[auto_1fr] gap-x-3 rounded-md border border-gray-300 bg-white/50 p-1 sm:grid-cols-[auto_1fr_auto]">
         {episodes.map((episode) => (
            <EpisodeRow
               key={episode.key}
               episode={episode}
               showSeries={showSeries}
               isLatest={episode.key === latestKey}
               isNext={episode.key === nextKey}
            />
         ))}
      </ul>
   );
}

function SeriesCard({ summary }: { summary: SeriesSummary }): JSX.Element {
   const headline =
      summary.status === "upcoming"
         ? summary.next
            ? `Premieres ${formatGap(summary.next.daysUntilAir)}`
            : ""
         : summary.status === "finished"
           ? "Complete"
           : `${summary.airedCount} of ${summary.episodeCount} out`;

   return (
      <Link
         to={`/startrek?series=${summary.id}`}
         className="rounded-md border border-gray-300 bg-white/60 p-3 no-underline transition-colors hover:bg-white"
      >
         <span className="flex items-baseline gap-2">
            <SeriesBadge shortName={summary.shortName} />
            <span className="font-semibold">{summary.name}</span>
         </span>
         <span className="mt-1 block text-xs text-gray-500">
            {summary.originalRunYears} · {summary.delayYears} years delayed
         </span>
         <span className="mt-1 block text-sm text-gray-700">{headline}</span>
         <ProgressBar value={summary.airedCount} max={summary.episodeCount} />
      </Link>
   );
}

function FreshPanel({ fresh }: { fresh: FreshView }): JSX.Element {
   const outNow = fresh.series.filter((series) => series.status === "running").length;

   return (
      <div className="space-y-8">
         <div className="aqua-panel p-4 sm:p-5">
            <h2 className="text-lg font-bold">Where everything stands</h2>
            <p className="text-sm text-gray-600">
               {outNow === 0
                  ? "Nothing is on the air yet."
                  : `${outNow} ${outNow === 1 ? "series is" : "series are"} on the air right now.`}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
               {fresh.series.map((summary) => (
                  <SeriesCard key={summary.id} summary={summary} />
               ))}
            </div>
         </div>

         <section className="space-y-2">
            <h2 className="text-lg font-bold">Just out</h2>
            {fresh.recent.length === 0 ? (
               <p className="text-gray-600">
                  Nothing has aired yet. The first episode is below.
               </p>
            ) : (
               <EpisodeList episodes={fresh.recent} showSeries />
            )}
         </section>

         <section className="space-y-2">
            <h2 className="text-lg font-bold">Coming up</h2>
            <EpisodeList episodes={fresh.upcoming} showSeries />
         </section>
      </div>
   );
}

function SubscribePanel({
   feed,
   label,
}: {
   feed: CalendarFeed;
   label: string;
}): JSX.Element {
   return (
      <div className="aqua-panel flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
         <div className="min-w-56 grow">
            <h2 className="font-bold">Subscribe</h2>
            <p className="text-sm text-gray-600">
               Put {label} in your calendar — one all-day entry per episode, on the day
               it comes out.
            </p>
         </div>
         <a className="aqua-btn aqua-btn--blue" href={feed.subscribeUrl}>
            Add to calendar
         </a>
         <a className="aqua-btn" href={feed.downloadUrl}>
            Download .ics
         </a>
         <p className="w-full text-xs break-all text-gray-500">
            Or paste this into your calendar app: {feed.downloadUrl}
         </p>
      </div>
   );
}

function SeasonSection({
   group,
   latestKey,
   nextKey,
}: {
   group: SeasonGroup;
   latestKey?: string;
   nextKey?: string;
}): JSX.Element {
   return (
      <section className="space-y-2">
         <h2 className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-lg font-bold">Season {group.season}</span>
            <span className="text-xs tabular-nums text-gray-500">
               {group.originalRunYears} · {group.episodeCount} episodes ·{" "}
               {group.airedCount} out
            </span>
         </h2>
         <EpisodeList
            episodes={group.episodes}
            latestKey={latestKey}
            nextKey={nextKey}
         />
      </section>
   );
}

function SeriesPanel({ schedule }: { schedule: Schedule }): JSX.Element {
   const seasons = React.useMemo(
      () => groupBySeason(schedule.episodes),
      [schedule.episodes],
   );

   return (
      <div className="space-y-8">
         <div className="aqua-panel p-4 sm:p-5">
            <h2 className="text-lg font-bold">{schedule.fullName}</h2>
            <p className="text-sm text-gray-600">
               {schedule.originalRunYears} · {schedule.delayYears} years delayed
            </p>

            <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
               <span className="text-3xl font-bold tabular-nums">
                  {schedule.airedCount}
               </span>
               <span className="text-gray-600">
                  of {schedule.episodeCount} episodes are out
               </span>
            </p>
            <ProgressBar value={schedule.airedCount} max={schedule.episodeCount} />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
               <HeroSlot
                  label="Latest episode"
                  episode={schedule.latest}
                  emptyMessage="Nothing yet — the premiere is still ahead."
               />
               <HeroSlot
                  label="Next episode"
                  episode={schedule.next}
                  emptyMessage="That's the lot. Every episode watched."
               />
            </div>
         </div>

         {seasons.map((group) => (
            <SeasonSection
               key={group.season}
               group={group}
               latestKey={schedule.latest?.key}
               nextKey={schedule.next?.key}
            />
         ))}
      </div>
   );
}

export default function StarTrek(): JSX.Element {
   const data = useLoaderData<typeof loader>();
   const { revalidate } = useRevalidator();

   useInterval(() => void revalidate(), refreshIntervalMs);

   const selectedId = data.view === "series" ? data.schedule.id : null;

   return (
      <div className="space-y-8">
         <header className="space-y-2">
            <h1 className="text-2xl font-bold">Star Trek, in real time</h1>
            <p className="max-w-2xl text-gray-600">
               TOS 60 years delayed, everything else 45 years delayed
            </p>
         </header>

         <nav className="aqua-toolbar flex-wrap rounded-md" aria-label="Series">
            <Link
               to="/startrek"
               className={`aqua-tab ${selectedId === null ? "aqua-tab--active" : ""}`}
               aria-current={selectedId === null ? "page" : undefined}
            >
               Fresh
            </Link>
            {data.tabs.map((tab) => (
               <Link
                  key={tab.id}
                  to={`/startrek?series=${tab.id}`}
                  className={`aqua-tab ${tab.id === selectedId ? "aqua-tab--active" : ""}`}
                  aria-current={tab.id === selectedId ? "page" : undefined}
               >
                  {tab.shortName}
                  <span className="ml-1.5 text-xs tabular-nums opacity-70">
                     {tab.airedCount}/{tab.episodeCount}
                  </span>
               </Link>
            ))}
         </nav>

         <SubscribePanel
            feed={data.feed}
            label={data.view === "fresh" ? "all five series" : data.schedule.fullName}
         />

         {data.view === "fresh" ? (
            <FreshPanel fresh={data.fresh} />
         ) : (
            <SeriesPanel schedule={data.schedule} />
         )}
      </div>
   );
}
