import { useQuery } from "@tanstack/react-query";
import React, { type JSX } from "react";
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

function formatTimeToStation(seconds: number): string {
   if (seconds < 60) return "due";
   const minutes = Math.floor(seconds / 60);
   return relativeTimeFormat.format(minutes, "minute");
}

function formatExpectedArrival(iso: string): string {
   return timeFormat.format(new Date(iso));
}

function ArrivalRow({ arrival }: { arrival: BusArrival }): JSX.Element {
   return (
      <li className="col-span-full grid grid-cols-subgrid items-center border-b border-gray-100 py-0.5 last:border-b-0">
         <span className="inline-flex min-w-8 justify-center rounded bg-red-600 px-1 py-0.5 font-bold leading-none text-white">
            {arrival.lineName}
         </span>
         <span className="truncate font-medium">{arrival.destinationName}</span>
         <span className="tabular-nums text-gray-500">
            {formatExpectedArrival(arrival.expectedArrival)}
         </span>
         <span className="text-right whitespace-nowrap tabular-nums">
            {formatTimeToStation(arrival.timeToStation)}
         </span>
      </li>
   );
}

function StationInfo({ station }: { station: BusStop }): JSX.Element {
   const query = useQuery({
      queryKey: ["busArrivals", station],
      queryFn: () => getBusArrivals(station),
      refetchInterval: 15_000,
   });

   const sorted = React.useMemo(
      () => (query.data ?? []).toSorted((a, b) => a.timeToStation - b.timeToStation),
      [query.data],
   );

   return (
      <section className="contents">
         <h2 className="col-span-full mt-4 flex items-baseline gap-2 font-semibold">
            {busStopNames[station]}
            {query.isFetching && (
               <span className="font-normal text-gray-400">updating…</span>
            )}
         </h2>
         {query.isError ? (
            <div className="col-span-full text-red-700">
               {query.error instanceof Error ? query.error.message : "Error"}
            </div>
         ) : sorted.length === 0 && !query.isLoading ? (
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
   return (
      <div className="mx-auto grid max-w-md grid-cols-[auto_1fr_auto_auto] gap-x-3 p-2">
         <StationInfo station={busStops.hammersmith} />
         <StationInfo station={busStops.ashchurchTerrace} />
         <StationInfo station={busStops.shepherdsBush} />
         <StationInfo station={busStops.askewRoad} />
      </div>
   );
}
