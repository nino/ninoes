import React, { type JSX } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { useInterval } from "~/hooks/useInterval";
import {
   type BusArrival,
   type BusStop,
   busStopNames,
   busStops,
   getBusArrivals,
} from "~/utils/tfl-api";

const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, {
   numeric: "auto",
   style: "short",
});

const timeFormat = new Intl.DateTimeFormat(undefined, {
   hour: "2-digit",
   minute: "2-digit",
});

const refreshIntervalMs = 15_000;

const stationOrder: Array<BusStop> = [
   busStops.hammersmith,
   busStops.ashchurchTerrace,
   busStops.shepherdsBush,
   busStops.askewRoadToShepherdsBush,
   busStops.askewRoadToActonGreen,
   busStops.woodLane,
];

type StationResult = {
   station: BusStop;
   arrivals: Array<BusArrival> | null;
   error: string | null;
};

export const loader = async (): Promise<{ stations: Array<StationResult> }> => {
   const stations = await Promise.all(
      stationOrder.map(async (station): Promise<StationResult> => {
         try {
            const arrivals = await getBusArrivals(station);
            return { station, arrivals, error: null };
         } catch (error) {
            return {
               station,
               arrivals: null,
               error: error instanceof Error ? error.message : "Error",
            };
         }
      }),
   );
   return { stations };
};

function formatTimeToStation(seconds: number): string {
   if (seconds < 60) return "due";
   const minutes = Math.floor(seconds / 60);
   return relativeTimeFormat.format(minutes, "minute");
}

function formatExpectedArrival(iso: string): string {
   return timeFormat.format(new Date(iso));
}

function ArrivalRow({ arrival }: { arrival: BusArrival }): JSX.Element {
   const timeToStation = formatTimeToStation(arrival.timeToStation);
   return (
      <li className="col-span-full grid grid-cols-subgrid items-center border-b border-gray-100 py-0.5 last:border-b-0">
         <span className="inline-flex min-w-8 justify-center rounded bg-red-600 px-1 py-0.5 font-bold leading-none text-white">
            {arrival.lineName}
         </span>
         <span className="truncate font-medium">{arrival.destinationName}</span>
         <span className="tabular-nums text-gray-500">
            {formatExpectedArrival(arrival.expectedArrival)}
         </span>
         <span
            className={`text-right whitespace-nowrap tabular-nums ${timeToStation === "due" ? "animate-wiggle" : ""}`}
         >
            {timeToStation}
         </span>
      </li>
   );
}

function StationInfo({
   result,
   isUpdating,
}: {
   result: StationResult;
   isUpdating: boolean;
}): JSX.Element {
   const sorted = React.useMemo(
      () =>
         (result.arrivals ?? [])
            .slice(0, 3)
            .toSorted((a, b) => a.timeToStation - b.timeToStation),
      [result.arrivals],
   );

   return (
      <section className="contents">
         <h2 className="col-span-full mt-4 flex items-baseline gap-2 font-semibold">
            {busStopNames[result.station]}
            {isUpdating && (
               <span className="font-normal text-gray-400">updating…</span>
            )}
         </h2>
         {result.error != null ? (
            <div className="col-span-full text-red-700">{result.error}</div>
         ) : sorted.length === 0 ? (
            <div className="col-span-full text-gray-500">No arrivals</div>
         ) : (
            <ul className="contents">
               {sorted.map((arrival) => (
                  <ArrivalRow key={arrival.id} arrival={arrival} />
               ))}
            </ul>
         )}
      </section>
   );
}

export default function Page(): JSX.Element {
   const { stations } = useLoaderData<typeof loader>();
   const { revalidate, state } = useRevalidator();

   // Re-run the loader on an interval so JS clients get live updates. Without
   // JS the page still server-renders a correct snapshot on each full load.
   useInterval(() => void revalidate(), refreshIntervalMs);

   return (
      <div className="mx-auto grid max-w-md grid-cols-[auto_1fr_auto_auto] gap-x-3 p-2">
         {stations.map((result) => (
            <StationInfo
               key={result.station}
               result={result}
               isUpdating={state === "loading"}
            />
         ))}
      </div>
   );
}
