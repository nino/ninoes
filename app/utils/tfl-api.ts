import type { Enum } from "~/model/types";
import { fetchJson } from "./fetch";

const tflApiBaseUrl = "https://api.tfl.gov.uk";

export const busStops = {
   hammersmith: "490007705C",
   ashchurchTerrace: "490003424S",
   shepherdsBush: "490000203C",
   askewRoad: "490015455E",
} as const;

export type BusStop = Enum<typeof busStops>;

export const busStopNames: Record<BusStop, string> = {
   [busStops.hammersmith]: "Hammersmith Bus Station",
   [busStops.ashchurchTerrace]: "Ashchurch Terrace Bus Station",
   [busStops.shepherdsBush]: "Shepherds Bush Bus Station",
   [busStops.askewRoad]: "Askew Road Bus Station",
};

const linesPerStop = {
   [busStops.hammersmith]: [218, 306],
   [busStops.ashchurchTerrace]: [218, 306],
   [busStops.shepherdsBush]: [237],
   [busStops.askewRoad]: [94],
} as const;

export type BusArrival = {
   $type: string;
   id: string;
   operationType: number;
   vehicleId: string;
   naptanId: string;
   stationName: string;
   lineId: string;
   lineName: string;
   platformName: string;
   direction: string;
   bearing: string;
   tripId: string;
   baseVersion: string;
   destinationNaptanId: string;
   destinationName: string;
   timestamp: string;
   timeToStation: number;
   currentLocation: string;
   towards: string;
   expectedArrival: string;
   timeToLive: string;
   modeName: string;
   timing: {
      $type: string;
      countdownServerAdjustment: string;
      source: string;
      insert: string;
      read: string;
      sent: string;
      received: string;
   };
};

export async function getBusArrivals(stopId: BusStop): Promise<Array<BusArrival>> {
   const lines = linesPerStop[stopId];
   console.log(`Getting arrivals for stop ${stopId} and lines ${lines.join(",")}`);
   const arrivals = await fetchJson<Array<BusArrival>>(
      `${tflApiBaseUrl}/Line/${lines.join(",")}/Arrivals/${stopId}`,
   );
   return arrivals;
}
