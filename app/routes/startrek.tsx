import React, { type JSX } from "react";
import {
   Link,
   type LoaderFunctionArgs,
   useLoaderData,
   useRevalidator,
} from "react-router";
import { useInterval } from "~/hooks/useInterval";
import {
   cardClass,
   focusRing,
   outlineButton,
   primaryButton,
} from "~/components/ui/styles";
import { externalOrigin } from "~/utils/request";
import { formatAirDate, formatGap, formatShortDate } from "~/utils/startrek-format";
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
   | { view: "fresh"; fresh: FreshView }
   | { view: "series"; schedule: Schedule }
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
         className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
         role="progressbar"
         aria-valuenow={value}
         aria-valuemin={0}
         aria-valuemax={max}
         aria-label={`${value} of ${max} episodes aired`}
      >
         <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${(value / max) * 100}%` }}
         />
      </div>
   );
}

function SeriesBadge({ shortName }: { shortName: string }): JSX.Element {
   return (
      <span className="inline-block min-w-[2.6rem] rounded-sm bg-muted-fg px-1.5 py-px text-center text-[10px] font-bold tracking-wide text-card">
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
      <div className="rounded-lg border border-border p-3">
         <h3 className="text-[11px] font-semibold tracking-wide text-muted-fg uppercase">
            {label}
         </h3>
         {episode == null ? (
            <p className="mt-1 text-muted-fg">{emptyMessage}</p>
         ) : (
            <>
               <p className="mt-1 flex items-baseline gap-2 leading-tight font-semibold">
                  {showSeries && <SeriesBadge shortName={episode.seriesShortName} />}
                  <span>{episode.title}</span>
               </p>
               <p className="mt-1 text-muted-fg">
                  <span className="tabular-nums">{episodeCode(episode)}</span> ·{" "}
                  {formatAirDate(episode.airDate)}
               </p>
               {episode.summary !== "" && (
                  <p className="mt-1 text-sm text-muted-fg">{episode.summary}</p>
               )}
               <p className="mt-0.5 font-medium text-primary">
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
      ? "bg-muted"
      : isNext
        ? "ring-1 ring-ring/50 ring-inset"
        : "";

   return (
      <li
         className={`col-span-full grid grid-cols-subgrid items-baseline gap-x-3 rounded-md border-b border-border px-2 py-1.5 last:border-b-0 ${highlight} ${
            episode.hasAired ? "" : "text-faint-fg"
         }`}
      >
         <span className="flex items-baseline gap-1.5 tabular-nums">
            <span
               className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                  episode.hasAired
                     ? "bg-primary"
                     : "border border-muted-fg bg-transparent"
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
               <span className="ml-2 rounded-sm bg-primary px-1.5 py-px text-[10px] font-bold tracking-wide text-primary-fg uppercase">
                  Latest
               </span>
            )}
            {isNext && (
               <span className="ml-2 rounded-sm border border-primary/50 px-1.5 py-px text-[10px] font-bold tracking-wide text-primary uppercase">
                  Next
               </span>
            )}
            {episode.summary !== "" && (
               <span className="mt-0.5 block text-sm text-muted-fg">
                  {episode.summary}
               </span>
            )}
            <span className="block text-xs text-faint-fg">
               originally {formatShortDate(episode.originalAirDate)}
               <span className="sr-only">
                  {episode.hasAired ? " — already aired" : " — not out yet"}
               </span>
            </span>
         </span>

         {/* The dates sit beside the title on wide screens and drop onto their
             own line beneath it on narrow ones, so titles aren't squeezed. */}
         <span className="col-start-2 flex flex-row items-baseline gap-x-2 sm:col-start-3 sm:flex-col sm:items-end sm:gap-x-0">
            <span className="whitespace-nowrap tabular-nums">
               {formatAirDate(episode.airDate)}
            </span>
            <span className="text-xs whitespace-nowrap text-faint-fg">
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
      <ul className="grid grid-cols-[auto_1fr] gap-x-3 rounded-xl border border-border bg-card p-1 shadow-xs sm:grid-cols-[auto_1fr_auto]">
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
         className={`rounded-lg border border-border p-3 transition-colors hover:bg-muted ${focusRing}`}
      >
         <span className="flex items-baseline gap-2">
            <SeriesBadge shortName={summary.shortName} />
            <span className="font-semibold">{summary.name}</span>
         </span>
         <span className="mt-1 block text-xs text-faint-fg">
            {summary.originalRunYears} · {summary.delayYears} years delayed
         </span>
         <span className="mt-1 block text-sm text-muted-fg">{headline}</span>
         <ProgressBar value={summary.airedCount} max={summary.episodeCount} />
      </Link>
   );
}

function FreshPanel({ fresh }: { fresh: FreshView }): JSX.Element {
   const outNow = fresh.series.filter((series) => series.status === "running").length;

   return (
      <div className="space-y-8">
         <div className={`p-4 sm:p-5 ${cardClass}`}>
            <h2 className="text-lg font-semibold">Where everything stands</h2>
            <p className="text-sm text-muted-fg">
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
            <h2 className="text-lg font-semibold">Just out</h2>
            {fresh.recent.length === 0 ? (
               <p className="text-muted-fg">
                  Nothing has aired yet. The first episode is below.
               </p>
            ) : (
               <EpisodeList episodes={fresh.recent} showSeries />
            )}
         </section>

         <section className="space-y-2">
            <h2 className="text-lg font-semibold">Coming up</h2>
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
      <div
         className={`flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:p-5 ${cardClass}`}
      >
         <div className="min-w-56 grow">
            <h2 className="font-semibold">Subscribe</h2>
            <p className="text-sm text-muted-fg">
               Put {label} in your calendar — one all-day entry per episode, on the day
               it comes out.
            </p>
         </div>
         <a className={primaryButton} href={feed.subscribeUrl}>
            Add to calendar
         </a>
         <a className={outlineButton} href={feed.downloadUrl}>
            Download .ics
         </a>
         <p className="w-full text-xs break-all text-faint-fg">
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
            <span className="text-lg font-semibold">Season {group.season}</span>
            <span className="text-xs tabular-nums text-faint-fg">
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
         <div className={`p-4 sm:p-5 ${cardClass}`}>
            <h2 className="text-lg font-semibold">{schedule.fullName}</h2>
            <p className="text-sm text-muted-fg">
               {schedule.originalRunYears} · {schedule.delayYears} years delayed
            </p>

            <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
               <span className="font-title text-3xl tabular-nums">
                  {schedule.airedCount}
               </span>
               <span className="text-muted-fg">
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

function tabClass(active: boolean): string {
   return `flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors ${focusRing} ${
      active ? "bg-card text-fg shadow-xs" : "text-muted-fg hover:text-fg"
   }`;
}

export default function StarTrek(): JSX.Element {
   const data = useLoaderData<typeof loader>();
   const { revalidate } = useRevalidator();

   useInterval(() => void revalidate(), refreshIntervalMs);

   const selectedId = data.view === "series" ? data.schedule.id : null;

   return (
      <div className="space-y-8">
         <header className="space-y-2">
            <h1 className="font-title text-3xl">Star Trek, in real time</h1>
            <p className="max-w-2xl text-muted-fg">
               TOS 60 years delayed, everything else 45 years delayed
            </p>
         </header>

         <nav
            className="inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-muted p-[3px]"
            aria-label="Series"
         >
            <Link
               to="/startrek"
               className={tabClass(selectedId === null)}
               aria-current={selectedId === null ? "page" : undefined}
            >
               Fresh
            </Link>
            {data.tabs.map((tab) => (
               <Link
                  key={tab.id}
                  to={`/startrek?series=${tab.id}`}
                  className={tabClass(tab.id === selectedId)}
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
